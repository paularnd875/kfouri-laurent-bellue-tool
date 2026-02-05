#!/usr/bin/env python3
"""
Scraper final pour extraire TOUS les emails des avocats du Barreau de Nantes
Basé sur les URLs des fiches individuelles trouvées dans les sitemaps
"""

import time
import json
import csv
import re
import argparse
import requests
from bs4 import BeautifulSoup
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed
import logging
from urllib.parse import urljoin

# Configuration du logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('barreau_nantes_emails.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class EmailScraperFinal:
    def __init__(self, delay=1, max_workers=3):
        self.delay = delay
        self.max_workers = max_workers
        self.session_start = datetime.now()
        self.lawyers_data = []
        
        # Configuration session requests
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.7559.133 Safari/537.36'
        })
        
    def get_all_lawyer_urls(self):
        """Récupère toutes les URLs des avocats depuis les sitemaps"""
        try:
            logger.info("Récupération des URLs depuis les sitemaps...")
            
            sitemap_urls = [
                'https://www.barreaunantes.fr/lawyer-sitemap1.xml',
                'https://www.barreaunantes.fr/lawyer-sitemap2.xml'
            ]
            
            all_urls = []
            
            for sitemap_url in sitemap_urls:
                try:
                    response = self.session.get(sitemap_url, timeout=15)
                    if response.status_code == 200:
                        soup = BeautifulSoup(response.text, 'xml')
                        urls = soup.find_all('url')
                        
                        for url_elem in urls:
                            loc = url_elem.find('loc')
                            if loc:
                                url = loc.text.strip()
                                # Filtrer pour ne garder que les fiches individuelles
                                if '/annuaire/' in url and url != 'https://www.barreaunantes.fr/annuaire/':
                                    all_urls.append(url)
                        
                        logger.info(f"Sitemap {sitemap_url}: {len(urls)} URLs")
                        
                except Exception as e:
                    logger.error(f"Erreur avec sitemap {sitemap_url}: {e}")
            
            logger.info(f"Total URLs d'avocats trouvées: {len(all_urls)}")
            return all_urls
            
        except Exception as e:
            logger.error(f"Erreur récupération URLs: {e}")
            return []
    
    def extract_lawyer_info(self, url):
        """Extrait toutes les informations d'un avocat depuis sa fiche"""
        try:
            time.sleep(self.delay)  # Respect du serveur
            
            response = self.session.get(url, timeout=10)
            
            if response.status_code != 200:
                logger.warning(f"Erreur {response.status_code} pour {url}")
                return None
            
            soup = BeautifulSoup(response.text, 'html.parser')
            lawyer_data = {'url': url}
            
            # 1. Extraction du nom depuis le titre
            title = soup.find('title')
            if title:
                title_text = title.text.strip()
                lawyer_data['titre_page'] = title_text
                
                # Extraire le nom du titre (format: "Prénom NOM - Avocat(e) au Barreau de Nantes")
                name_match = re.match(r'^([^-]+)', title_text)
                if name_match:
                    full_name = name_match.group(1).strip()
                    lawyer_data['nom_complet'] = full_name
                    
                    # Séparer prénom et nom
                    name_parts = full_name.split()
                    if len(name_parts) >= 2:
                        lawyer_data['prenom'] = name_parts[0]
                        lawyer_data['nom'] = ' '.join(name_parts[1:])
            
            # 2. Extraction des emails (multiple patterns)
            emails = set()
            
            # Pattern standard
            standard_emails = re.findall(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', response.text)
            emails.update(standard_emails)
            
            # Liens mailto
            mailto_links = re.findall(r'mailto:([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,})', response.text)
            emails.update(mailto_links)
            
            # Nettoyer les emails (enlever les faux positifs)
            valid_emails = []
            for email in emails:
                if (email and 
                    '@' in email and 
                    '.' in email and
                    not email.startswith('http') and
                    len(email) > 5 and
                    not any(invalid in email.lower() for invalid in ['example', 'test', 'localhost'])):
                    valid_emails.append(email)
            
            if valid_emails:
                lawyer_data['email'] = valid_emails[0]  # Premier email valide
                if len(valid_emails) > 1:
                    lawyer_data['emails_supplementaires'] = valid_emails[1:]
            
            # 3. Extraction du téléphone
            phone_patterns = [
                r'(?:0[1-9](?:[\s\.\-]?\d{2}){4})',
                r'(?:\+33[1-9](?:[\s\.\-]?\d{2}){4})',
                r'(?:0\d[\s\.\-]?\d{2}[\s\.\-]?\d{2}[\s\.\-]?\d{2}[\s\.\-]?\d{2})'
            ]
            
            for pattern in phone_patterns:
                phones = re.findall(pattern, response.text)
                if phones:
                    lawyer_data['telephone'] = phones[0]
                    break
            
            # 4. Extraction des spécialisations
            specializations = []
            
            # Chercher dans le contenu de la page
            text_content = soup.get_text().lower()
            
            # Mots-clés de spécialisations courantes
            specialization_keywords = [
                'droit commercial', 'droit des affaires', 'droit de la famille',
                'droit pénal', 'droit du travail', 'droit immobilier',
                'droit fiscal', 'droit public', 'droit de la propriété intellectuelle',
                'droit de la santé', 'droit social', 'droit des sociétés',
                'contentieux', 'arbitrage', 'médiation'
            ]
            
            for keyword in specialization_keywords:
                if keyword in text_content:
                    specializations.append(keyword.title())
            
            if specializations:
                lawyer_data['specialisations'] = list(set(specializations))
            
            # 5. Extraction du cabinet/structure
            # Chercher des éléments qui pourraient indiquer le cabinet
            cabinet_indicators = soup.find_all(text=re.compile(r'(Cabinet|SELARL|SCP|Avocats|Associés)', re.IGNORECASE))
            if cabinet_indicators:
                for indicator in cabinet_indicators[:3]:
                    clean_text = indicator.strip()
                    if len(clean_text) > 5 and len(clean_text) < 100:
                        lawyer_data['cabinet'] = clean_text
                        break
            
            # 6. Extraction de l'adresse
            # Chercher des patterns d'adresse
            address_patterns = [
                r'\d+[^,\n]*(?:rue|avenue|boulevard|place|mail|allée)[^,\n]*',
                r'(?:rue|avenue|boulevard|place|mail|allée)[^,\n]*\d{5}[^,\n]*'
            ]
            
            for pattern in address_patterns:
                addresses = re.findall(pattern, response.text, re.IGNORECASE)
                if addresses:
                    # Prendre la première adresse qui semble valide
                    for addr in addresses:
                        clean_addr = re.sub(r'<[^>]*>', '', addr).strip()
                        if len(clean_addr) > 10 and 'nantes' in clean_addr.lower():
                            lawyer_data['adresse'] = clean_addr
                            break
                    if 'adresse' in lawyer_data:
                        break
            
            # 7. Métadonnées d'extraction
            lawyer_data['timestamp_extraction'] = datetime.now().isoformat()
            lawyer_data['source'] = 'fiche_individuelle'
            
            # Log du succès
            name = lawyer_data.get('nom_complet', 'Nom inconnu')
            email = lawyer_data.get('email', 'Pas d\'email')
            logger.info(f"✓ {name} - {email}")
            
            return lawyer_data
            
        except Exception as e:
            logger.error(f"Erreur extraction {url}: {e}")
            return None
    
    def scrape_all_emails(self, test_mode=False, max_urls=None):
        """Scrape tous les emails des avocats"""
        try:
            logger.info("=== DÉBUT EXTRACTION COMPLÈTE DES EMAILS ===")
            
            # Récupérer toutes les URLs
            all_urls = self.get_all_lawyer_urls()
            
            if not all_urls:
                logger.error("Aucune URL trouvée")
                return []
            
            # Mode test ou complet
            if test_mode:
                urls_to_process = all_urls[:50]  # 50 premiers pour test
                logger.info(f"Mode TEST: traitement de {len(urls_to_process)} URLs")
            elif max_urls:
                urls_to_process = all_urls[:max_urls]
                logger.info(f"Mode LIMITÉ: traitement de {len(urls_to_process)} URLs")
            else:
                urls_to_process = all_urls
                logger.info(f"Mode COMPLET: traitement de {len(urls_to_process)} URLs")
            
            # Extraction avec gestion de la concurrence
            lawyers_data = []
            errors = 0
            
            if self.max_workers > 1:
                # Mode multi-thread
                logger.info(f"Extraction avec {self.max_workers} threads parallèles")
                
                with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
                    # Soumettre tous les jobs
                    future_to_url = {
                        executor.submit(self.extract_lawyer_info, url): url 
                        for url in urls_to_process
                    }
                    
                    # Traiter les résultats
                    for i, future in enumerate(as_completed(future_to_url), 1):
                        try:
                            lawyer_data = future.result()
                            if lawyer_data:
                                lawyers_data.append(lawyer_data)
                            else:
                                errors += 1
                                
                        except Exception as e:
                            errors += 1
                            url = future_to_url[future]
                            logger.error(f"Erreur future {url}: {e}")
                        
                        # Afficher le progrès
                        if i % 50 == 0:
                            logger.info(f"Progrès: {i}/{len(urls_to_process)} - {len(lawyers_data)} succès, {errors} erreurs")
            
            else:
                # Mode séquentiel
                logger.info("Extraction séquentielle")
                
                for i, url in enumerate(urls_to_process, 1):
                    try:
                        lawyer_data = self.extract_lawyer_info(url)
                        if lawyer_data:
                            lawyers_data.append(lawyer_data)
                        else:
                            errors += 1
                            
                    except Exception as e:
                        errors += 1
                        logger.error(f"Erreur {url}: {e}")
                    
                    # Afficher le progrès
                    if i % 20 == 0:
                        logger.info(f"Progrès: {i}/{len(urls_to_process)} - {len(lawyers_data)} succès, {errors} erreurs")
            
            logger.info(f"=== EXTRACTION TERMINÉE ===")
            logger.info(f"URLs traitées: {len(urls_to_process)}")
            logger.info(f"Avocats extraits: {len(lawyers_data)}")
            logger.info(f"Erreurs: {errors}")
            logger.info(f"Taux de succès: {len(lawyers_data)/len(urls_to_process)*100:.1f}%")
            
            # Compter les emails trouvés
            emails_count = len([l for l in lawyers_data if l.get('email')])
            logger.info(f"Emails trouvés: {emails_count}")
            
            self.lawyers_data = lawyers_data
            return lawyers_data
            
        except Exception as e:
            logger.error(f"Erreur scraping global: {e}")
            return []
    
    def save_comprehensive_results(self, filename_base="barreau_nantes_emails"):
        """Sauvegarde complète avec focus sur les emails"""
        if not self.lawyers_data:
            logger.warning("Aucune donnée à sauvegarder")
            return
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # JSON complet
        json_filename = f"{filename_base}_complet_{timestamp}.json"
        with open(json_filename, 'w', encoding='utf-8') as f:
            json.dump({
                'extraction_metadata': {
                    'timestamp': datetime.now().isoformat(),
                    'total_lawyers': len(self.lawyers_data),
                    'emails_found': len([l for l in self.lawyers_data if l.get('email')]),
                    'duration': str(datetime.now() - self.session_start)
                },
                'lawyers': self.lawyers_data
            }, f, ensure_ascii=False, indent=2)
        
        # CSV avec toutes les informations
        csv_filename = f"{filename_base}_complet_{timestamp}.csv"
        if self.lawyers_data:
            all_keys = set()
            for lawyer in self.lawyers_data:
                all_keys.update(lawyer.keys())
            
            with open(csv_filename, 'w', newline='', encoding='utf-8') as f:
                writer = csv.DictWriter(f, fieldnames=sorted(all_keys))
                writer.writeheader()
                writer.writerows(self.lawyers_data)
        
        # CSV spécial EMAILS SEULEMENT
        emails_only = [l for l in self.lawyers_data if l.get('email')]
        if emails_only:
            emails_csv = f"{filename_base}_EMAILS_ONLY_{timestamp}.csv"
            
            with open(emails_csv, 'w', newline='', encoding='utf-8') as f:
                # Colonnes prioritaires pour les emails
                priority_fields = ['nom_complet', 'prenom', 'nom', 'email', 'telephone', 'cabinet', 'specialisations', 'adresse', 'url']
                
                # Ajouter les autres champs
                all_fields = set()
                for lawyer in emails_only:
                    all_fields.update(lawyer.keys())
                
                final_fields = priority_fields + [f for f in sorted(all_fields) if f not in priority_fields]
                
                writer = csv.DictWriter(f, fieldnames=final_fields)
                writer.writeheader()
                writer.writerows(emails_only)
            
            logger.info(f"Fichier emails spécial: {emails_csv}")
        
        # Statistiques détaillées
        stats = {
            'extraction_summary': {
                'total_avocats': len(self.lawyers_data),
                'avec_email': len([l for l in self.lawyers_data if l.get('email')]),
                'avec_telephone': len([l for l in self.lawyers_data if l.get('telephone')]),
                'avec_specialisations': len([l for l in self.lawyers_data if l.get('specialisations')]),
                'avec_cabinet': len([l for l in self.lawyers_data if l.get('cabinet')]),
            },
            'emails_stats': {
                'total_emails': len([l for l in self.lawyers_data if l.get('email')]),
                'domaines_emails': {},
                'types_emails': {}
            },
            'performance': {
                'duree_extraction': str(datetime.now() - self.session_start),
                'timestamp_fin': datetime.now().isoformat()
            }
        }
        
        # Analyser les domaines d'emails
        for lawyer in self.lawyers_data:
            if lawyer.get('email'):
                email = lawyer['email']
                domain = email.split('@')[-1] if '@' in email else 'unknown'
                stats['emails_stats']['domaines_emails'][domain] = stats['emails_stats']['domaines_emails'].get(domain, 0) + 1
                
                # Type d'email
                if 'gmail.com' in email:
                    email_type = 'Gmail personnel'
                elif 'proton.me' in email:
                    email_type = 'Proton personnel'
                elif any(word in email for word in ['avocat', 'cabinet', 'law']):
                    email_type = 'Email professionnel'
                else:
                    email_type = 'Autre'
                
                stats['emails_stats']['types_emails'][email_type] = stats['emails_stats']['types_emails'].get(email_type, 0) + 1
        
        stats_filename = f"{filename_base}_statistiques_{timestamp}.json"
        with open(stats_filename, 'w', encoding='utf-8') as f:
            json.dump(stats, f, ensure_ascii=False, indent=2)
        
        logger.info(f"Fichiers sauvegardés:")
        logger.info(f"  - JSON complet: {json_filename}")
        logger.info(f"  - CSV complet: {csv_filename}")
        logger.info(f"  - Statistiques: {stats_filename}")
        
        # Affichage des statistiques
        print(f"\n🎉 === RÉSULTATS FINAUX === 🎉")
        print(f"Total avocats traités: {stats['extraction_summary']['total_avocats']}")
        print(f"📧 EMAILS TROUVÉS: {stats['extraction_summary']['avec_email']}")
        print(f"📞 Avec téléphone: {stats['extraction_summary']['avec_telephone']}")
        print(f"🏢 Avec cabinet: {stats['extraction_summary']['avec_cabinet']}")
        print(f"⚖️ Avec spécialisations: {stats['extraction_summary']['avec_specialisations']}")
        print(f"⏱️ Durée: {stats['performance']['duree_extraction']}")
        
        if stats['emails_stats']['domaines_emails']:
            print(f"\n📊 TOP DOMAINES D'EMAILS:")
            for domain, count in sorted(stats['emails_stats']['domaines_emails'].items(), 
                                       key=lambda x: x[1], reverse=True)[:10]:
                print(f"   {domain}: {count} emails")
        
        return json_filename, csv_filename, emails_csv if emails_only else None, stats_filename

def main():
    parser = argparse.ArgumentParser(description='Scraper final pour emails avocats Barreau de Nantes')
    parser.add_argument('--test', action='store_true', help='Mode test (50 premiers avocats)')
    parser.add_argument('--max-urls', type=int, help='Nombre maximum d\'URLs à traiter')
    parser.add_argument('--delay', type=float, default=0.5, help='Délai entre requêtes (secondes)')
    parser.add_argument('--workers', type=int, default=3, help='Nombre de threads parallèles')
    
    args = parser.parse_args()
    
    print("📧 === SCRAPER FINAL EMAILS BARREAU DE NANTES === 📧")
    print(f"Mode: {'TEST (50 URLs)' if args.test else 'COMPLET (1300+ URLs)'}")
    print(f"Délai: {args.delay}s entre requêtes")
    print(f"Threads: {args.workers}")
    print()
    
    scraper = EmailScraperFinal(
        delay=args.delay,
        max_workers=args.workers
    )
    
    try:
        results = scraper.scrape_all_emails(
            test_mode=args.test,
            max_urls=args.max_urls
        )
        
        if results:
            files = scraper.save_comprehensive_results()
            
            print(f"\n📁 Fichiers créés:")
            for file_path in files:
                if file_path:
                    print(f"   {file_path}")
            
            # Afficher quelques exemples d'emails trouvés
            emails_found = [l for l in results if l.get('email')]
            if emails_found:
                print(f"\n📧 EXEMPLES D'EMAILS EXTRAITS:")
                for lawyer in emails_found[:10]:
                    name = lawyer.get('nom_complet', 'Nom inconnu')
                    email = lawyer.get('email', '')
                    print(f"   {name} - {email}")
                
                if len(emails_found) > 10:
                    print(f"   ... et {len(emails_found) - 10} autres emails")
        
        print(f"\n🎯 === MISSION ACCOMPLIE === 🎯")
        
    except KeyboardInterrupt:
        print("\n⏹️ === INTERRUPTION UTILISATEUR ===")
        logger.info("Extraction interrompue par l'utilisateur")
    except Exception as e:
        print(f"\n❌ === ERREUR ===")
        print(f"Erreur: {e}")
        logger.error(f"Erreur fatale: {e}")

if __name__ == "__main__":
    main()