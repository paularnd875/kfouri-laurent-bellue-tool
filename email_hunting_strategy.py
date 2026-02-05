#!/usr/bin/env python3
"""
Stratégie complète pour trouver les emails des avocats
"""

import time
import re
import requests
from bs4 import BeautifulSoup
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait, Select
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_individual_profiles():
    """Test pour voir s'il existe des fiches individuelles d'avocats"""
    
    options = Options()
    options.add_argument('--headless')
    options.add_argument('--no-sandbox')
    options.add_argument('--disable-dev-shm-usage')
    
    try:
        service = Service(ChromeDriverManager().install())
        driver = webdriver.Chrome(service=service, options=options)
        
        print("=== RECHERCHE DE FICHES INDIVIDUELLES D'AVOCATS ===")
        
        # 1. Chercher des patterns d'URLs pour avocats individuels
        driver.get("https://www.barreaunantes.fr/annuaire/")
        time.sleep(3)
        
        # Appliquer un filtre pour avoir des résultats
        form = driver.find_element(By.TAG_NAME, "form")
        ville_select = form.find_element(By.CSS_SELECTOR, "select[name='ville']")
        select_obj = Select(ville_select)
        select_obj.select_by_value("ANCENIS")
        
        submit_btn = form.find_element(By.CSS_SELECTOR, "input[type='submit']")
        submit_btn.click()
        time.sleep(5)
        
        page_source = driver.page_source
        
        # Chercher tous les liens dans la page de résultats
        links = driver.find_elements(By.TAG_NAME, "a")
        
        print(f"\n1. Analyse de {len(links)} liens dans la page de résultats:")
        
        lawyer_profile_links = []
        for link in links:
            href = link.get_attribute('href')
            text = link.text.strip()
            
            if href and any(keyword in href.lower() for keyword in 
                           ['avocat', 'lawyer', 'profile', 'fiche', 'membre']):
                lawyer_profile_links.append({
                    'url': href,
                    'text': text,
                    'type': 'potential_profile'
                })
        
        print(f"   Liens potentiels vers profils: {len(lawyer_profile_links)}")
        for link in lawyer_profile_links[:5]:
            print(f"     {link['text']} -> {link['url']}")
        
        # 2. Test de patterns d'URLs courants pour avocats
        print("\n2. Test de patterns d'URLs courants:")
        
        test_patterns = [
            "https://www.barreaunantes.fr/annuaire/avocat/{nom}",
            "https://www.barreaunantes.fr/avocat/{nom}",
            "https://www.barreaunantes.fr/avocats/{nom}",
            "https://www.barreaunantes.fr/membre/{nom}",
            "https://www.barreaunantes.fr/profile/{nom}",
        ]
        
        # Test avec quelques noms d'avocats qu'on a trouvés
        test_names = ['bouche', 'caron', 'ad-conseil', 'mrv']
        
        session = requests.Session()
        session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        })
        
        for pattern in test_patterns:
            for name in test_names:
                test_url = pattern.replace('{nom}', name)
                try:
                    response = session.head(test_url, timeout=5, allow_redirects=True)
                    if response.status_code == 200:
                        print(f"   ✅ TROUVÉ: {test_url}")
                        
                        # Tester le contenu de cette page
                        full_response = session.get(test_url)
                        if full_response.status_code == 200:
                            emails = re.findall(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', 
                                               full_response.text)
                            if emails:
                                print(f"       📧 Emails trouvés: {emails}")
                    elif response.status_code != 404:
                        print(f"   ⚠️  {test_url} -> Status {response.status_code}")
                        
                except requests.RequestException:
                    pass  # URL n'existe pas
        
        # 3. Chercher dans le sitemap ou robots.txt
        print("\n3. Analyse du sitemap et robots.txt:")
        
        sitemap_urls = [
            "https://www.barreaunantes.fr/sitemap.xml",
            "https://www.barreaunantes.fr/sitemap_index.xml",
            "https://www.barreaunantes.fr/robots.txt"
        ]
        
        for url in sitemap_urls:
            try:
                response = session.get(url, timeout=10)
                if response.status_code == 200:
                    print(f"   ✅ {url} accessible")
                    
                    # Chercher des patterns d'avocats
                    content = response.text
                    avocat_urls = re.findall(r'https://[^<>\s]*(?:avocat|lawyer|membre)[^<>\s]*', content)
                    
                    if avocat_urls:
                        print(f"     URLs d'avocats trouvées: {len(avocat_urls)}")
                        for avocat_url in avocat_urls[:5]:
                            print(f"       {avocat_url}")
                            
                            # Tester ces URLs pour des emails
                            try:
                                test_response = session.get(avocat_url, timeout=5)
                                if test_response.status_code == 200:
                                    emails = re.findall(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', 
                                                       test_response.text)
                                    if emails:
                                        print(f"         📧 Emails: {emails}")
                            except:
                                pass
                                
            except requests.RequestException as e:
                print(f"   ❌ {url} non accessible: {e}")
        
        # 4. Analyser la structure du site pour des endpoints cachés
        print("\n4. Recherche d'endpoints cachés ou d'API:")
        
        # Chercher des scripts JavaScript qui pourraient révéler des endpoints
        scripts = driver.find_elements(By.TAG_NAME, "script")
        
        for i, script in enumerate(scripts):
            script_content = driver.execute_script("return arguments[0].innerHTML;", script)
            if script_content:
                # Chercher des patterns d'API ou d'endpoints
                api_patterns = [
                    r'api/avocat',
                    r'ajax.*avocat',
                    r'wp-json.*avocat',
                    r'/membre/',
                    r'/profile/',
                    r'endpoint.*avocat'
                ]
                
                for pattern in api_patterns:
                    matches = re.findall(pattern, script_content, re.IGNORECASE)
                    if matches:
                        print(f"   Script {i+1}: Pattern '{pattern}' trouvé: {matches}")
        
        # 5. Test d'accès direct avec les noms de cabinets
        print("\n5. Test avec noms de cabinets connus:")
        
        # Cabinets qu'on a trouvés
        cabinets = [
            'AD Conseil',
            'BOEZEC CARON BOUCHE Avocats', 
            'MRV Avocats',
            'TGS France Avocats'
        ]
        
        for cabinet in cabinets:
            # Créer des variations d'URLs
            cabinet_slug = cabinet.lower().replace(' ', '-').replace('avocats', '').strip('-')
            
            test_urls = [
                f"https://www.barreaunantes.fr/cabinet/{cabinet_slug}",
                f"https://www.barreaunantes.fr/cabinets/{cabinet_slug}",
                f"https://www.barreaunantes.fr/annuaire/{cabinet_slug}",
            ]
            
            for test_url in test_urls:
                try:
                    response = session.head(test_url, timeout=3)
                    if response.status_code == 200:
                        print(f"   ✅ Cabinet trouvé: {test_url}")
                        
                        # Vérifier le contenu
                        full_response = session.get(test_url)
                        emails = re.findall(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', 
                                           full_response.text)
                        if emails:
                            print(f"     📧 Emails trouvés: {emails}")
                            
                except:
                    pass
        
    except Exception as e:
        print(f"Erreur: {e}")
        
    finally:
        if 'driver' in locals():
            driver.quit()

def test_alternative_sources():
    """Test des sources alternatives d'emails d'avocats"""
    
    print("\n=== SOURCES ALTERNATIVES D'EMAILS ===")
    
    session = requests.Session()
    session.headers.update({
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    })
    
    # Test des annuaires alternatifs
    alternative_sources = [
        {
            'name': 'Conseil National des Barreaux',
            'url': 'https://consultation.cnb.avocat.fr/',
            'search_pattern': 'nantes'
        },
        {
            'name': 'Pages Jaunes Avocats',
            'url': 'https://www.pagesjaunes.fr/annuaire/nantes-44/avocats',
            'search_pattern': None
        },
        {
            'name': 'Ordre des Avocats (site national)',
            'url': 'https://www.avocats.fr/annuaire-des-avocats',
            'search_pattern': 'nantes'
        }
    ]
    
    for source in alternative_sources:
        print(f"\n--- {source['name']} ---")
        try:
            response = session.get(source['url'], timeout=10)
            if response.status_code == 200:
                print(f"✅ Accessible: {source['url']}")
                
                # Chercher des emails
                emails = re.findall(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', response.text)
                if emails:
                    print(f"📧 Emails trouvés: {len(emails)}")
                    for email in emails[:5]:
                        print(f"   {email}")
                
                # Chercher des références aux cabinets qu'on connaît
                for cabinet in ['AD Conseil', 'BOEZEC', 'MRV']:
                    if cabinet.lower() in response.text.lower():
                        print(f"🎯 Cabinet '{cabinet}' mentionné sur cette source")
                        
            else:
                print(f"❌ Non accessible: Status {response.status_code}")
                
        except Exception as e:
            print(f"❌ Erreur: {e}")

def main():
    print("🎯 STRATÉGIE COMPLÈTE DE RECHERCHE D'EMAILS")
    print("=" * 60)
    
    # Phase 1: Test des profils individuels
    test_individual_profiles()
    
    # Phase 2: Test des sources alternatives  
    test_alternative_sources()
    
    print("\n" + "=" * 60)
    print("📋 RÉSUMÉ DES STRATÉGIES:")
    print("1. ✅ Recherche de fiches individuelles sur le site principal")
    print("2. ✅ Test d'endpoints et APIs cachées")
    print("3. ✅ Analyse des sources alternatives")
    print("4. 🔄 Prochaines étapes selon les résultats...")

if __name__ == "__main__":
    main()