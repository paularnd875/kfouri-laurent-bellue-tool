#!/usr/bin/env python3
import requests
from bs4 import BeautifulSoup
import json
import re
from urllib.parse import urljoin
# No need for cssutils in this simplified version

def extract_design_system(url):
    """Extract design system elements from a website"""
    
    try:
        # Fetch the webpage
        headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        }
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, 'html.parser')
        
        design_system = {
            'colors': {},
            'typography': {},
            'layout': {},
            'components': {},
            'spacing': {}
        }
        
        # Extract inline styles
        inline_styles = []
        for element in soup.find_all(style=True):
            inline_styles.append(element.get('style', ''))
        
        # Extract style tags
        style_contents = []
        for style_tag in soup.find_all('style'):
            if style_tag.string:
                style_contents.append(style_tag.string)
        
        # Extract external CSS links
        css_urls = []
        for link in soup.find_all('link', rel='stylesheet'):
            href = link.get('href')
            if href:
                full_url = urljoin(url, href)
                css_urls.append(full_url)
        
        # Fetch and analyze external CSS
        all_css = '\n'.join(style_contents)
        for css_url in css_urls[:5]:  # Limit to first 5 CSS files
            try:
                css_response = requests.get(css_url, headers=headers, timeout=5)
                if css_response.status_code == 200:
                    all_css += '\n' + css_response.text
            except:
                continue
        
        # Parse CSS and extract design tokens
        colors = set()
        fonts = set()
        font_sizes = set()
        spacing_values = set()
        
        # Extract colors (hex, rgb, rgba)
        color_patterns = [
            r'#[0-9a-fA-F]{3,8}',
            r'rgb\([^)]+\)',
            r'rgba\([^)]+\)',
            r'hsl\([^)]+\)',
            r'hsla\([^)]+\)'
        ]
        
        for pattern in color_patterns:
            matches = re.findall(pattern, all_css)
            colors.update(matches)
        
        # Extract font families
        font_pattern = r'font-family:\s*([^;]+);'
        font_matches = re.findall(font_pattern, all_css)
        for match in font_matches:
            fonts.add(match.strip())
        
        # Extract font sizes
        size_pattern = r'font-size:\s*([^;]+);'
        size_matches = re.findall(size_pattern, all_css)
        for match in size_matches:
            font_sizes.add(match.strip())
        
        # Extract spacing (padding, margin)
        spacing_patterns = [
            r'padding:\s*([^;]+);',
            r'margin:\s*([^;]+);',
            r'gap:\s*([^;]+);'
        ]
        
        for pattern in spacing_patterns:
            matches = re.findall(pattern, all_css)
            spacing_values.update(matches)
        
        # Analyze HTML structure
        headings = {}
        for i in range(1, 7):
            h_tags = soup.find_all(f'h{i}')
            if h_tags:
                sample = h_tags[0]
                headings[f'h{i}'] = {
                    'text': sample.get_text(strip=True)[:50],
                    'classes': sample.get('class', [])
                }
        
        # Find buttons
        buttons = []
        for button in soup.find_all(['button', 'a']):
            classes = button.get('class', [])
            if classes or 'btn' in str(button).lower() or 'button' in str(button).lower():
                buttons.append({
                    'text': button.get_text(strip=True)[:30],
                    'classes': classes,
                    'style': button.get('style', '')
                })
        
        # Find navigation
        nav_elements = soup.find_all(['nav', 'header'])
        navigation = []
        for nav in nav_elements[:2]:
            navigation.append({
                'tag': nav.name,
                'classes': nav.get('class', []),
                'style': nav.get('style', '')
            })
        
        # Find cards/sections
        cards = []
        for element in soup.find_all(['article', 'section', 'div']):
            classes = element.get('class', [])
            class_str = ' '.join(classes) if classes else ''
            if 'card' in class_str.lower() or 'box' in class_str.lower() or 'container' in class_str.lower():
                cards.append({
                    'tag': element.name,
                    'classes': classes,
                    'style': element.get('style', '')
                })
        
        # Compile results
        design_system['colors'] = {
            'all_colors': list(colors)[:50],  # Limit to 50 colors
            'primary_colors': [],
            'text_colors': [],
            'background_colors': []
        }
        
        # Try to categorize colors
        for color in colors:
            if 'background' in all_css[max(0, all_css.find(color)-50):all_css.find(color)+50]:
                design_system['colors']['background_colors'].append(color)
            elif 'color:' in all_css[max(0, all_css.find(color)-20):all_css.find(color)+20]:
                design_system['colors']['text_colors'].append(color)
        
        design_system['typography'] = {
            'font_families': list(fonts)[:10],
            'font_sizes': list(font_sizes)[:20],
            'headings': headings
        }
        
        design_system['spacing'] = {
            'values': list(spacing_values)[:30]
        }
        
        design_system['components'] = {
            'buttons': buttons[:10],
            'navigation': navigation,
            'cards': cards[:10]
        }
        
        # Extract meta information
        meta_description = soup.find('meta', attrs={'name': 'description'})
        if meta_description:
            design_system['meta'] = {
                'description': meta_description.get('content', '')
            }
        
        title = soup.find('title')
        if title:
            design_system['meta'] = design_system.get('meta', {})
            design_system['meta']['title'] = title.get_text()
        
        return design_system
        
    except Exception as e:
        print(f"Error extracting design system: {e}")
        return None

def generate_css_from_design(design_system):
    """Generate CSS variables and styles from extracted design system"""
    
    css = """/* Design System CSS Variables */
/* Extracted from kfouri-laurentbellue.paris */

:root {
"""
    
    # Add color variables
    if design_system.get('colors'):
        css += "  /* Colors */\n"
        
        # Add unique colors
        unique_colors = set()
        for color in design_system['colors'].get('all_colors', [])[:20]:
            if color not in unique_colors:
                unique_colors.add(color)
                var_name = f"color-{len(unique_colors)}"
                css += f"  --{var_name}: {color};\n"
        
        # Text colors
        css += "\n  /* Text Colors */\n"
        for i, color in enumerate(design_system['colors'].get('text_colors', [])[:5], 1):
            css += f"  --text-color-{i}: {color};\n"
        
        # Background colors
        css += "\n  /* Background Colors */\n"
        for i, color in enumerate(design_system['colors'].get('background_colors', [])[:5], 1):
            css += f"  --bg-color-{i}: {color};\n"
    
    # Add typography variables
    if design_system.get('typography'):
        css += "\n  /* Typography */\n"
        
        # Font families
        for i, font in enumerate(design_system['typography'].get('font_families', [])[:3], 1):
            css += f"  --font-family-{i}: {font};\n"
        
        # Font sizes
        css += "\n  /* Font Sizes */\n"
        sizes = design_system['typography'].get('font_sizes', [])
        # Sort sizes if they're numeric
        numeric_sizes = []
        for size in sizes:
            try:
                if 'px' in size or 'rem' in size or 'em' in size:
                    numeric_sizes.append(size)
            except:
                pass
        
        for i, size in enumerate(sorted(set(numeric_sizes))[:7], 1):
            css += f"  --font-size-{i}: {size};\n"
    
    # Add spacing variables
    if design_system.get('spacing'):
        css += "\n  /* Spacing */\n"
        spacing_values = design_system['spacing'].get('values', [])
        
        # Extract numeric spacing values
        numeric_spacing = []
        for value in spacing_values:
            parts = value.split()
            for part in parts:
                if any(unit in part for unit in ['px', 'rem', 'em', '%']):
                    numeric_spacing.append(part)
        
        unique_spacing = sorted(set(numeric_spacing))[:10]
        for i, space in enumerate(unique_spacing, 1):
            css += f"  --spacing-{i}: {space};\n"
    
    css += "}\n\n"
    
    # Add component styles based on findings
    css += """/* Component Styles */

/* Typography */
body {
  font-family: var(--font-family-1, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif);
  color: var(--text-color-1, #333);
  background-color: var(--bg-color-1, #fff);
}

h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-family-1);
  font-weight: 600;
  line-height: 1.2;
}

/* Buttons */
.btn, button {
  padding: var(--spacing-2, 0.5rem) var(--spacing-3, 1rem);
  border-radius: 4px;
  border: 1px solid transparent;
  transition: all 0.3s ease;
  cursor: pointer;
}

/* Cards */
.card {
  padding: var(--spacing-4, 1.5rem);
  border-radius: 8px;
  background: var(--bg-color-2, #f8f9fa);
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

/* Layout */
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 var(--spacing-3, 1rem);
}
"""
    
    return css

def main():
    url = "https://kfouri-laurentbellue.paris/"
    print(f"Extracting design system from {url}...")
    
    design_system = extract_design_system(url)
    
    if design_system:
        # Save JSON
        with open('design_system.json', 'w', encoding='utf-8') as f:
            json.dump(design_system, f, indent=2, ensure_ascii=False)
        print("✓ Saved design_system.json")
        
        # Generate and save CSS
        css = generate_css_from_design(design_system)
        with open('design_system.css', 'w', encoding='utf-8') as f:
            f.write(css)
        print("✓ Saved design_system.css")
        
        # Print summary
        print("\n=== Design System Summary ===")
        print(f"Colors found: {len(design_system['colors'].get('all_colors', []))}")
        print(f"Font families: {len(design_system['typography'].get('font_families', []))}")
        print(f"Font sizes: {len(design_system['typography'].get('font_sizes', []))}")
        print(f"Buttons found: {len(design_system['components'].get('buttons', []))}")
        print(f"Navigation elements: {len(design_system['components'].get('navigation', []))}")
        
        print("\n=== Sample Colors ===")
        for color in design_system['colors'].get('all_colors', [])[:10]:
            print(f"  {color}")
        
        print("\n=== Font Families ===")
        for font in design_system['typography'].get('font_families', [])[:5]:
            print(f"  {font}")
        
        print("\n=== Font Sizes ===")
        for size in design_system['typography'].get('font_sizes', [])[:10]:
            print(f"  {size}")
    else:
        print("Failed to extract design system")

if __name__ == "__main__":
    main()