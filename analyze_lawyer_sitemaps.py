#!/usr/bin/env python3
"""
Analyse des sitemaps spécifiques aux avocats
"""

import requests
import re
from bs4 import BeautifulSoup
import time
from urllib.parse import urljoin

def analyze_lawyer_sitemaps():
    """Analyse les sitemaps des avocats pour trouver des URLs individuelles"""
    
    session = requests.Session()
    session.headers.update({
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    })
    
    print("🔍 ANALYSE DES SITEMAPS AVOCATS")
    print("=" * 50)
    
    sitemap_urls = [
        'https://www.barreaunantes.fr/lawyer-sitemap1.xml',
        'https://www.barreaunantes.fr/lawyer-sitemap2.xml'
    ]
    
    all_lawyer_urls = []
    
    for sitemap_url in sitemap_urls:
        try:
            print(f"\n📄 Analyse de {sitemap_url}")
            response = session.get(sitemap_url, timeout=15)
            
            if response.status_code == 200:
                print(f"✅ Sitemap accessible ({len(response.text)} caractères)")
                
                # Parser le XML
                soup = BeautifulSoup(response.text, 'xml')
                
                # Chercher toutes les URLs
                urls = soup.find_all('url')
                print(f"📊 {len(urls)} URLs trouvées dans ce sitemap")
                
                # Extraire les URLs des avocats
                for url_elem in urls:
                    loc = url_elem.find('loc')
                    if loc:
                        url = loc.text.strip()
                        all_lawyer_urls.append(url)
                        
                # Afficher quelques exemples
                print(f"🔗 Exemples d'URLs:")
                for url in all_lawyer_urls[-10:]:  # 10 dernières URLs
                    print(f"   {url}")
                    
            else:
                print(f"❌ Erreur {response.status_code}")
                
        except Exception as e:
            print(f"❌ Erreur avec {sitemap_url}: {e}")
    
    print(f"\n📈 TOTAL: {len(all_lawyer_urls)} URLs d'avocats trouvées")
    
    if all_lawyer_urls:
        print(f"\n🧪 TEST D'EXTRACTION D'EMAILS")
        print("-" * 40)
        
        # Tester quelques URLs pour voir si elles contiennent des emails
        test_urls = all_lawyer_urls[:10]  # Tester les 10 premières
        
        emails_found = []
        successful_profiles = []
        
        for i, url in enumerate(test_urls, 1):
            try:
                print(f"\n{i}. Test de {url}")
                response = session.get(url, timeout=10)
                
                if response.status_code == 200:
                    print(f"   ✅ Page accessible ({len(response.text)} caractères)")
                    
                    # Chercher des emails
                    emails = re.findall(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', response.text)
                    
                    if emails:
                        unique_emails = list(set(emails))
                        print(f"   📧 {len(unique_emails)} email(s) trouvé(s): {unique_emails}")
                        emails_found.extend(unique_emails)
                        successful_profiles.append(url)
                    else:
                        print(f"   ⚪ Aucun email trouvé")
                    
                    # Chercher d'autres infos utiles
                    soup = BeautifulSoup(response.text, 'html.parser')
                    
                    # Titre de la page
                    title = soup.find('title')
                    if title:
                        print(f"   📑 Titre: {title.text.strip()[:100]}")
                    
                    # Chercher des éléments de contact
                    contact_indicators = [
                        'téléphone', 'phone', 'contact', 'cabinet', 'avocat',
                        'spécialisation', 'domaine', 'expertise'
                    ]
                    
                    text_content = response.text.lower()
                    found_indicators = [ind for ind in contact_indicators if ind in text_content]
                    if found_indicators:
                        print(f"   🎯 Éléments détectés: {', '.join(found_indicators)}")
                    
                else:
                    print(f"   ❌ Erreur {response.status_code}")
                
                # Pause pour être respectueux
                time.sleep(1)
                
            except Exception as e:
                print(f"   ❌ Erreur: {e}")
                
        # Résumé des tests
        print(f"\n📊 RÉSUMÉ DES TESTS")
        print(f"URLs testées: {len(test_urls)}")
        print(f"Profils avec emails: {len(successful_profiles)}")
        print(f"Total emails uniques: {len(set(emails_found))}")
        
        if emails_found:
            print(f"\n📧 EMAILS TROUVÉS:")
            unique_emails = list(set(emails_found))
            for email in unique_emails:
                print(f"   {email}")
        
        if successful_profiles:
            print(f"\n✅ PROFILS AVEC EMAILS:")
            for profile in successful_profiles:
                print(f"   {profile}")
        
        # Analyser les patterns d'URLs
        print(f"\n🔍 ANALYSE DES PATTERNS D'URLs")
        print("-" * 40)
        
        if all_lawyer_urls:
            # Extraire les patterns communs
            patterns = {}
            for url in all_lawyer_urls[:20]:  # Analyser les 20 premières
                # Extraire la partie après le domaine
                path = url.replace('https://www.barreaunantes.fr/', '')
                parts = path.split('/')
                
                if len(parts) >= 1:
                    category = parts[0]
                    patterns[category] = patterns.get(category, 0) + 1
            
            print("Catégories d'URLs trouvées:")
            for pattern, count in sorted(patterns.items(), key=lambda x: x[1], reverse=True):
                print(f"   /{pattern}/: {count} URLs")
        
        return all_lawyer_urls, emails_found, successful_profiles
    
    else:
        print("❌ Aucune URL d'avocat trouvée dans les sitemaps")
        return [], [], []

def test_email_extraction_patterns(lawyer_urls):
    """Test différents patterns pour extraire les emails"""
    
    if not lawyer_urls:
        return
    
    print(f"\n🧪 TEST DE PATTERNS D'EXTRACTION D'EMAILS")
    print("=" * 50)
    
    session = requests.Session()
    session.headers.update({
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    })
    
    # Test avec 5 URLs différentes
    test_urls = lawyer_urls[:5]
    
    extraction_patterns = {
        'regex_standard': r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',
        'regex_obfusque': r'[A-Za-z0-9._%+-]+\s*\[at\]\s*[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}',
        'regex_points': r'[A-Za-z0-9._%+-]+\s*\.+\s*@\s*\.+\s*[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}',
        'mailto_links': r'mailto:([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,})',
    }
    
    for i, url in enumerate(test_urls, 1):
        try:
            print(f"\n{i}. Analyse approfondie de {url}")
            response = session.get(url, timeout=10)
            
            if response.status_code == 200:
                content = response.text
                soup = BeautifulSoup(content, 'html.parser')
                
                print(f"   📄 Contenu: {len(content)} caractères")
                
                # Test de chaque pattern
                total_emails = set()
                
                for pattern_name, pattern_regex in extraction_patterns.items():
                    emails = re.findall(pattern_regex, content, re.IGNORECASE)
                    if emails:
                        print(f"   📧 {pattern_name}: {emails}")
                        total_emails.update(emails)
                
                # Chercher dans les attributs HTML
                email_attributes = []
                for attr in ['data-email', 'data-mail', 'href']:
                    elements = soup.find_all(attrs={attr: True})
                    for elem in elements:
                        attr_value = elem.get(attr, '')
                        if '@' in attr_value and '.' in attr_value:
                            email_attributes.append(attr_value)
                
                if email_attributes:
                    print(f"   🔗 Attributs HTML: {email_attributes}")
                    total_emails.update(email_attributes)
                
                # Chercher du JavaScript avec des emails
                scripts = soup.find_all('script')
                js_emails = set()
                for script in scripts:
                    if script.string:
                        script_emails = re.findall(extraction_patterns['regex_standard'], 
                                                 script.string, re.IGNORECASE)
                        js_emails.update(script_emails)
                
                if js_emails:
                    print(f"   🟨 JavaScript: {list(js_emails)}")
                    total_emails.update(js_emails)
                
                # Résumé pour cette URL
                if total_emails:
                    print(f"   ✅ TOTAL: {len(total_emails)} email(s) unique(s): {list(total_emails)}")
                else:
                    print(f"   ⚪ Aucun email trouvé avec tous les patterns")
                    
            time.sleep(1)  # Pause respectueuse
            
        except Exception as e:
            print(f"   ❌ Erreur: {e}")

def main():
    # Phase 1: Analyser les sitemaps
    lawyer_urls, emails_found, successful_profiles = analyze_lawyer_sitemaps()
    
    # Phase 2: Test approfondi des patterns d'extraction
    if lawyer_urls:
        test_email_extraction_patterns(lawyer_urls)
    
    # Phase 3: Conclusions et recommandations
    print(f"\n🎯 CONCLUSIONS ET RECOMMANDATIONS")
    print("=" * 50)
    
    if emails_found:
        print(f"✅ SUCCESS: {len(set(emails_found))} emails d'avocats trouvés !")
        print(f"✅ {len(successful_profiles)} profils contiennent des emails")
        print(f"✅ Total URLs disponibles: {len(lawyer_urls)}")
        
        print(f"\n📋 PROCHAINES ÉTAPES:")
        print(f"1. Créer un scraper pour toutes les {len(lawyer_urls)} URLs")
        print(f"2. Extraire emails + infos complètes (nom, spécialisations, etc.)")
        print(f"3. Implémenter les patterns d'extraction qui marchent")
        print(f"4. Gérer les délais pour éviter la surcharge du serveur")
        
    else:
        print(f"⚠️ Aucun email trouvé dans les tests")
        print(f"❓ Possible que les emails soient:")
        print(f"   - Protégés par JavaScript dynamique")
        print(f"   - Obfusqués ou encodés")
        print(f"   - Accessibles seulement aux membres connectés")
        print(f"   - Sur des pages non indexées dans les sitemaps")
    
    return lawyer_urls, emails_found

if __name__ == "__main__":
    main()