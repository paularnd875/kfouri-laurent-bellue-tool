const puppeteer = require('puppeteer');
const fs = require('fs').promises;

async function extractDesignSystem() {
    const browser = await puppeteer.launch({
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
        const page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });
        
        console.log('Navigating to website...');
        await page.goto('https://kfouri-laurentbellue.paris/', {
            waitUntil: 'networkidle2',
            timeout: 30000
        });
        
        // Wait for content to load
        await page.waitForTimeout(3000);
        
        // Take a screenshot for reference
        await page.screenshot({ 
            path: 'design_reference.png',
            fullPage: true 
        });
        
        console.log('Extracting design system...');
        
        // Extract all design elements
        const designSystem = await page.evaluate(() => {
            const results = {
                colors: {},
                typography: {},
                spacing: {},
                layout: {},
                components: {},
                animations: {}
            };
            
            // Helper function to get computed styles
            const getStyles = (selector) => {
                const element = document.querySelector(selector);
                if (!element) return null;
                return window.getComputedStyle(element);
            };
            
            // Helper to convert rgb to hex
            const rgbToHex = (rgb) => {
                if (!rgb || !rgb.includes('rgb')) return rgb;
                const match = rgb.match(/\d+/g);
                if (!match) return rgb;
                const hex = match.map(x => {
                    const hex = parseInt(x).toString(16);
                    return hex.length === 1 ? '0' + hex : hex;
                });
                return '#' + hex.join('');
            };
            
            // Extract color palette
            const extractColors = () => {
                const colors = new Set();
                const backgrounds = new Set();
                const borders = new Set();
                
                // Get all elements
                const allElements = document.querySelectorAll('*');
                
                allElements.forEach(el => {
                    const styles = window.getComputedStyle(el);
                    
                    // Text colors
                    if (styles.color) {
                        colors.add(rgbToHex(styles.color));
                    }
                    
                    // Background colors
                    if (styles.backgroundColor && styles.backgroundColor !== 'rgba(0, 0, 0, 0)') {
                        backgrounds.add(rgbToHex(styles.backgroundColor));
                    }
                    
                    // Border colors
                    if (styles.borderColor && styles.borderColor !== 'rgba(0, 0, 0, 0)') {
                        borders.add(rgbToHex(styles.borderColor));
                    }
                });
                
                return {
                    textColors: Array.from(colors),
                    backgroundColors: Array.from(backgrounds),
                    borderColors: Array.from(borders)
                };
            };
            
            // Extract typography
            const extractTypography = () => {
                const fonts = new Set();
                const sizes = new Set();
                const weights = new Set();
                const lineHeights = new Set();
                
                const textElements = document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, a, span, li, button');
                
                textElements.forEach(el => {
                    const styles = window.getComputedStyle(el);
                    fonts.add(styles.fontFamily);
                    sizes.add(styles.fontSize);
                    weights.add(styles.fontWeight);
                    lineHeights.add(styles.lineHeight);
                });
                
                // Get specific heading styles
                const headingStyles = {};
                for (let i = 1; i <= 6; i++) {
                    const h = document.querySelector(`h${i}`);
                    if (h) {
                        const styles = window.getComputedStyle(h);
                        headingStyles[`h${i}`] = {
                            fontSize: styles.fontSize,
                            fontWeight: styles.fontWeight,
                            fontFamily: styles.fontFamily,
                            lineHeight: styles.lineHeight,
                            color: rgbToHex(styles.color),
                            marginTop: styles.marginTop,
                            marginBottom: styles.marginBottom
                        };
                    }
                }
                
                return {
                    fontFamilies: Array.from(fonts),
                    fontSizes: Array.from(sizes),
                    fontWeights: Array.from(weights),
                    lineHeights: Array.from(lineHeights),
                    headings: headingStyles
                };
            };
            
            // Extract spacing patterns
            const extractSpacing = () => {
                const margins = new Set();
                const paddings = new Set();
                
                const allElements = document.querySelectorAll('*');
                
                allElements.forEach(el => {
                    const styles = window.getComputedStyle(el);
                    
                    // Margins
                    ['marginTop', 'marginRight', 'marginBottom', 'marginLeft'].forEach(prop => {
                        if (styles[prop] && styles[prop] !== '0px') {
                            margins.add(styles[prop]);
                        }
                    });
                    
                    // Paddings
                    ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft'].forEach(prop => {
                        if (styles[prop] && styles[prop] !== '0px') {
                            paddings.add(styles[prop]);
                        }
                    });
                });
                
                return {
                    margins: Array.from(margins).sort((a, b) => parseFloat(a) - parseFloat(b)),
                    paddings: Array.from(paddings).sort((a, b) => parseFloat(a) - parseFloat(b))
                };
            };
            
            // Extract button styles
            const extractButtons = () => {
                const buttons = document.querySelectorAll('button, a.btn, [class*="button"], [class*="btn"]');
                const buttonStyles = [];
                
                buttons.forEach(btn => {
                    const styles = window.getComputedStyle(btn);
                    buttonStyles.push({
                        className: btn.className,
                        backgroundColor: rgbToHex(styles.backgroundColor),
                        color: rgbToHex(styles.color),
                        padding: styles.padding,
                        borderRadius: styles.borderRadius,
                        border: styles.border,
                        fontSize: styles.fontSize,
                        fontWeight: styles.fontWeight,
                        textTransform: styles.textTransform,
                        transition: styles.transition,
                        boxShadow: styles.boxShadow
                    });
                });
                
                return buttonStyles;
            };
            
            // Extract navigation styles
            const extractNavigation = () => {
                const nav = document.querySelector('nav, header, [class*="nav"], [class*="menu"]');
                if (!nav) return null;
                
                const styles = window.getComputedStyle(nav);
                return {
                    backgroundColor: rgbToHex(styles.backgroundColor),
                    height: styles.height,
                    padding: styles.padding,
                    position: styles.position,
                    boxShadow: styles.boxShadow,
                    borderBottom: styles.borderBottom
                };
            };
            
            // Extract card/container styles
            const extractCards = () => {
                const cards = document.querySelectorAll('[class*="card"], [class*="box"], article, section > div');
                const cardStyles = [];
                
                cards.forEach(card => {
                    const styles = window.getComputedStyle(card);
                    if (styles.backgroundColor !== 'rgba(0, 0, 0, 0)' || styles.border !== 'none') {
                        cardStyles.push({
                            className: card.className,
                            backgroundColor: rgbToHex(styles.backgroundColor),
                            padding: styles.padding,
                            borderRadius: styles.borderRadius,
                            border: styles.border,
                            boxShadow: styles.boxShadow
                        });
                    }
                });
                
                return cardStyles;
            };
            
            // Extract layout information
            const extractLayout = () => {
                const body = document.body;
                const container = document.querySelector('.container, .wrapper, main, [class*="container"]');
                
                const bodyStyles = window.getComputedStyle(body);
                const containerStyles = container ? window.getComputedStyle(container) : null;
                
                return {
                    body: {
                        backgroundColor: rgbToHex(bodyStyles.backgroundColor),
                        fontFamily: bodyStyles.fontFamily,
                        fontSize: bodyStyles.fontSize,
                        lineHeight: bodyStyles.lineHeight,
                        color: rgbToHex(bodyStyles.color)
                    },
                    container: containerStyles ? {
                        maxWidth: containerStyles.maxWidth,
                        margin: containerStyles.margin,
                        padding: containerStyles.padding
                    } : null
                };
            };
            
            // Extract animations and transitions
            const extractAnimations = () => {
                const transitions = new Set();
                const transforms = new Set();
                
                const allElements = document.querySelectorAll('*');
                
                allElements.forEach(el => {
                    const styles = window.getComputedStyle(el);
                    
                    if (styles.transition && styles.transition !== 'none') {
                        transitions.add(styles.transition);
                    }
                    
                    if (styles.transform && styles.transform !== 'none') {
                        transforms.add(styles.transform);
                    }
                });
                
                return {
                    transitions: Array.from(transitions),
                    transforms: Array.from(transforms)
                };
            };
            
            // Execute all extractions
            results.colors = extractColors();
            results.typography = extractTypography();
            results.spacing = extractSpacing();
            results.buttons = extractButtons();
            results.navigation = extractNavigation();
            results.cards = extractCards();
            results.layout = extractLayout();
            results.animations = extractAnimations();
            
            return results;
        });
        
        // Save the extracted design system
        await fs.writeFile(
            'design_system.json',
            JSON.stringify(designSystem, null, 2)
        );
        
        // Generate CSS variables and styles
        const cssOutput = generateCSSFromDesignSystem(designSystem);
        await fs.writeFile('design_system.css', cssOutput);
        
        console.log('Design system extracted successfully!');
        console.log('Files created:');
        console.log('- design_reference.png (screenshot)');
        console.log('- design_system.json (extracted data)');
        console.log('- design_system.css (CSS variables and styles)');
        
        return designSystem;
        
    } catch (error) {
        console.error('Error extracting design system:', error);
        throw error;
    } finally {
        await browser.close();
    }
}

function generateCSSFromDesignSystem(designSystem) {
    let css = ':root {\n';
    
    // Add color variables
    if (designSystem.colors) {
        css += '  /* Colors */\n';
        designSystem.colors.textColors?.slice(0, 5).forEach((color, i) => {
            css += `  --color-text-${i + 1}: ${color};\n`;
        });
        designSystem.colors.backgroundColors?.slice(0, 5).forEach((color, i) => {
            css += `  --color-bg-${i + 1}: ${color};\n`;
        });
        designSystem.colors.borderColors?.slice(0, 3).forEach((color, i) => {
            css += `  --color-border-${i + 1}: ${color};\n`;
        });
    }
    
    // Add typography variables
    if (designSystem.typography) {
        css += '\n  /* Typography */\n';
        const fonts = designSystem.typography.fontFamilies?.slice(0, 3);
        fonts?.forEach((font, i) => {
            css += `  --font-family-${i + 1}: ${font};\n`;
        });
        
        const sizes = [...new Set(designSystem.typography.fontSizes)]
            .sort((a, b) => parseFloat(a) - parseFloat(b))
            .slice(0, 7);
        sizes?.forEach((size, i) => {
            css += `  --font-size-${i + 1}: ${size};\n`;
        });
    }
    
    // Add spacing variables
    if (designSystem.spacing) {
        css += '\n  /* Spacing */\n';
        const uniqueSpacing = [...new Set([
            ...designSystem.spacing.margins?.slice(0, 5) || [],
            ...designSystem.spacing.paddings?.slice(0, 5) || []
        ])].sort((a, b) => parseFloat(a) - parseFloat(b));
        
        uniqueSpacing.forEach((space, i) => {
            css += `  --spacing-${i + 1}: ${space};\n`;
        });
    }
    
    css += '}\n\n';
    
    // Add heading styles
    if (designSystem.typography?.headings) {
        Object.entries(designSystem.typography.headings).forEach(([tag, styles]) => {
            css += `${tag} {\n`;
            Object.entries(styles).forEach(([prop, value]) => {
                const cssProp = prop.replace(/([A-Z])/g, '-$1').toLowerCase();
                css += `  ${cssProp}: ${value};\n`;
            });
            css += '}\n\n';
        });
    }
    
    return css;
}

// Run the extraction
extractDesignSystem().catch(console.error);