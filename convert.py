import re

with open('style.css', 'r') as f:
    css = f.read()

# Replace :root variables
root_new = """:root {
    --bg-primary: #f4f1ea;
    --bg-secondary: #eaddcf;
    --bg-card: #ffffff;
    --bg-card-hover: #f9f9f9;
    --surface: #e0e0e0;
    --border: #000000;
    --border-glow: rgba(0,0,0,0.5);

    --text-primary: #111111;
    --text-secondary: #333333;
    --text-muted: #555555;

    --accent: #000000;
    --accent-light: #333333;
    --accent-glow: rgba(0,0,0,0.05);
    --cyan: #555555;
    --emerald: #333333;
    --rose: #111111;
    --amber: #666666;
    --violet: #444444;

    --gradient-hero: #f4f1ea;
    --gradient-card: #ffffff;
    --gradient-accent: #000000;

    --radius-sm: 0px;
    --radius-md: 0px;
    --radius-lg: 0px;
    --radius-xl: 0px;

    --shadow-card: none;
    --shadow-glow: none;

    --font: 'Lora', serif;
    --font-mono: 'Special Elite', monospace;
    --font-heading: 'Playfair Display', serif;
    --font-title: 'UnifrakturMaguntia', cursive;
}"""

css = re.sub(r':root\s*\{.*?\n\}', root_new, css, flags=re.DOTALL)

# Replace fonts for titles
css = css.replace('font-size: 2.4rem;\n    font-weight: 900;', 'font-size: 3.5rem;\n    font-weight: normal;\n    font-family: var(--font-title);')
css = css.replace('font-weight: 800;', 'font-weight: 700;\n    font-family: var(--font-heading);')
css = css.replace('font-weight: 700;', 'font-weight: 700;\n    font-family: var(--font-heading);')

# Make borders solid and thick
css = css.replace('border: 1px solid var(--border);', 'border: 2px solid #000;')
css = css.replace('border-bottom: 1px solid var(--border);', 'border-bottom: 2px solid #000;')
css = css.replace('border-top: 1px solid var(--border);', 'border-top: 2px solid #000;')

# Make background fill solid in progress bars
css = css.replace('background: var(--gradient-accent);', 'background: #000;')
css = css.replace('background: linear-gradient(135deg, var(--rose), var(--amber));', 'background: #555;')
css = css.replace('background: rgba(255,255,255,0.06);', 'background: transparent; border: 1px solid #000;')

# Remove newspaper glowing shadows
css = css.replace('box-shadow: var(--shadow-glow);', 'box-shadow: 5px 5px 0px #000;')

# Newspaper specific styling for the main container
css = css.replace('.newspaper {\n    background: rgba(255,255,255,0.03);\n    backdrop-filter: blur(20px);\n    border: 1px solid rgba(255,255,255,0.08);', 
                  '.newspaper {\n    background: #fff;\n    border: 4px double #000;\n    border-radius: 0;\n    color: #000;')

# Nav adjustments
css = css.replace('.nav {\n    position: sticky;\n    top: 0;\n    z-index: 100;\n    background: rgba(10,10,15,0.85);\n    backdrop-filter: blur(20px);',
                  '.nav {\n    position: sticky;\n    top: 0;\n    z-index: 100;\n    background: #f4f1ea;\n    border-bottom: 4px double #000;')

# Chart controls
css = css.replace('.ctrl-btn.active, .ctrl-btn:hover {\n    background: var(--accent);\n    color: white;',
                  '.ctrl-btn.active, .ctrl-btn:hover {\n    background: #000;\n    color: #fff;')

# Remove gradient texts
css = css.replace('-webkit-text-fill-color: transparent;', '-webkit-text-fill-color: initial;')
css = css.replace('background-clip: text;', '')

with open('style.css', 'w') as f:
    f.write(css)
print("done")
