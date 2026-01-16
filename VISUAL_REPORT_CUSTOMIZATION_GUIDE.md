# 🎨 Visual Report Customization Guide
## Google Sheets-Style Freedom for PDF Reports

## 🎯 The Problem
You want the same freedom you had in Google Sheets to:
- ✅ Move elements anywhere
- ✅ Change colors instantly
- ✅ Adjust spacing visually
- ✅ Control exact positioning
- ✅ See changes immediately

## 💡 The Solution: Direct HTML/CSS Editing

Your reports are **pure HTML/CSS files** that you can edit like code, but with **visual results**.

---

## 📁 Where to Edit

### Delivery Note Template Files:
```
src/modules/reporting/templates/delivery-note/
├── header.html    ← Edit layout structure
├── body.html      ← Edit main content
├── footer.html    ← Edit footer
└── styles.css     ← Edit ALL colors, spacing, fonts
```

---

## 🎨 Quick Customization Examples

### 1. Change Colors

**File:** `styles.css`

```css
/* Change red header to blue */
.building-summary-table thead tr.header-red {
  background: #0071BC;  /* Change this color */
  color: white;
}

/* Change yellow highlight to green */
.building-summary-table td.highlight-orange {
  background: #00A651;  /* Change this color */
  font-weight: bold;
}

/* Change table header color */
.items-table thead tr.header-dark {
  background: #FF5733;  /* Any color you want */
  color: white;
}
```

### 2. Adjust Spacing

```css
/* Make header bigger */
.delivery-header {
  padding: 40px;  /* Increase from 20px */
}

/* Add more space between sections */
.building-summary-section {
  margin: 40px 0;  /* Increase spacing */
}

/* Adjust table cell padding */
.items-table td {
  padding: 15px;  /* Make cells bigger */
}
```

### 3. Change Fonts & Sizes

```css
/* Make title bigger */
.document-title {
  font-size: 36pt;  /* Increase from 28pt */
  color: #FF0000;   /* Change color */
}

/* Change table font size */
.items-table {
  font-size: 10pt;  /* Adjust size */
}
```

### 4. Reposition Elements

**File:** `header.html`

```html
<!-- Move logo to right side -->
<div class="delivery-header">
  <div class="header-center">
    <h1 class="document-title">{{translations.deliveryNote}}</h1>
  </div>
  <div class="header-right">
    <img src="data:image/svg+xml;base64,{{logoBase64}}" class="company-logo" />
  </div>
  <div class="header-left">
    <!-- Metadata moved to left -->
  </div>
</div>
```

### 5. Add New Sections

**File:** `body.html`

```html
<!-- Add a custom section anywhere -->
<div class="custom-section" style="background: #E8F5E9; padding: 20px; margin: 20px 0;">
  <h2>Custom Section Title</h2>
  <p>Your custom content here</p>
</div>
```

---

## 🚀 Live Preview Workflow

### Method 1: Browser Preview (Recommended)

1. **Generate a report**
   ```bash
   node test-delivery-note.js
   ```

2. **Open the PDF in browser**
   ```
   http://localhost:3000/outputs/reports/247/delivery-note-xxx.pdf
   ```

3. **Edit the template files** (`styles.css`, `body.html`, etc.)

4. **Regenerate the report** to see changes

5. **Repeat until perfect**

### Method 2: HTML Preview (Faster)

Create a preview HTML file:

```html
<!-- preview-delivery-note.html -->
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="src/modules/reporting/templates/global.css">
  <link rel="stylesheet" href="src/modules/reporting/templates/delivery-note/styles.css">
</head>
<body>
  <!-- Copy content from header.html + body.html + footer.html -->
  <!-- Replace {{variables}} with sample data -->
</body>
</html>
```

Open in browser, edit CSS, refresh to see changes instantly!

---

## 🎨 Color Palette Reference

Use these exact colors from your image:

```css
/* Header Colors */
--red-header: #E74C3C;        /* Building summary header */
--yellow-header: #FFC000;     /* Shipment percentages */
--green-header: #00A651;      /* Project weight boxes */
--dark-header: #2C3E50;       /* Items table header */

/* Background Colors */
--light-gray: #F7F9FA;        /* Project info section */
--table-stripe: #F2F2F2;      /* Alternating rows */
--white: #FFFFFF;

/* Text Colors */
--text-dark: #2C3E50;
--text-gray: #7F8C8D;
```

---

## 📐 Layout Control

### Grid System

The templates use CSS Grid for precise positioning:

```css
/* 3-column layout example */
.shipment-summary-row {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;  /* 3 equal columns */
  gap: 15px;
}

/* 2-column layout */
.project-info-table {
  display: grid;
  grid-template-columns: 150px 1fr;  /* Label + Value */
}
```

### Flexbox for Alignment

```css
/* Center elements */
.header-center {
  display: flex;
  justify-content: center;
  align-items: center;
}

/* Space between */
.delivery-header {
  display: flex;
  justify-content: space-between;
}
```

---

## 🔧 Common Customizations

### Make Table Wider
```css
.items-table {
  width: 100%;
  font-size: 9pt;  /* Smaller font = more columns fit */
}
```

### Change Border Styles
```css
.items-table td {
  border: 2px solid #000;  /* Thicker borders */
}
```

### Add Background Images
```css
.delivery-header {
  background-image: url('path/to/image.png');
  background-size: cover;
}
```

### Custom Fonts
```css
@font-face {
  font-family: 'MyCustomFont';
  src: url('../fonts/MyFont.ttf');
}

body {
  font-family: 'MyCustomFont', sans-serif;
}
```

---

## 📊 Matching Your Image Exactly

Here's how to match each section from your screenshot:

### 1. Header Section
```css
.delivery-header {
  display: flex;
  justify-content: space-between;
  padding: 20px;
  border-bottom: 2px solid #E1E8ED;
}

.company-logo {
  height: 60px;
}

.document-title {
  font-size: 28pt;
  font-weight: bold;
}
```

### 2. Red/Yellow Building Summary
```css
.building-summary-table thead tr.header-red {
  background: #E74C3C;
  color: white;
}

.building-summary-table th {
  padding: 10px;
  font-weight: bold;
}
```

### 3. Green Summary Boxes
```css
.summary-box.green {
  background: #E8F5E9;
  border: 2px solid #00A651;
  padding: 15px;
  text-align: center;
}
```

### 4. Dark Table Header
```css
.items-table thead tr.header-dark {
  background: #2C3E50;
  color: white;
}
```

---

## 🎯 Step-by-Step: Match Your Image

### Step 1: Open Template Files
```
src/modules/reporting/templates/delivery-note/styles.css
```

### Step 2: Find the Section You Want to Change

Use comments in the CSS:
```css
/* ============================================
   HEADER SECTION
   ============================================ */

/* ============================================
   BUILDING SUMMARY TABLE
   ============================================ */
```

### Step 3: Edit Values

```css
/* BEFORE */
.delivery-header {
  padding: 20px;
}

/* AFTER - More space */
.delivery-header {
  padding: 30px;
}
```

### Step 4: Regenerate Report

```bash
node test-delivery-note.js
```

### Step 5: View PDF

Open the generated PDF and check if it matches your vision.

### Step 6: Repeat

Keep editing until it's perfect!

---

## 💡 Pro Tips

### 1. Use Browser DevTools
- Generate report
- Open PDF in Chrome
- Right-click → Inspect
- See exact CSS values
- Copy to your styles.css

### 2. Create Variations
Save different versions:
```
delivery-note-v1.css
delivery-note-v2.css
delivery-note-final.css
```

### 3. Use CSS Variables
```css
:root {
  --my-red: #E74C3C;
  --my-spacing: 20px;
}

.header {
  background: var(--my-red);
  padding: var(--my-spacing);
}
```

Change once, affects everywhere!

### 4. Comment Your Changes
```css
/* Changed 2024-12-10: Made header bigger per client request */
.delivery-header {
  padding: 30px;
}
```

---

## 🚀 Quick Start Checklist

- [ ] Open `src/modules/reporting/templates/delivery-note/styles.css`
- [ ] Change a color (e.g., red header to blue)
- [ ] Run `node test-delivery-note.js`
- [ ] Open generated PDF
- [ ] See your change!
- [ ] Repeat until perfect

---

## 📚 Resources

**Your Template Files:**
- `src/modules/reporting/templates/delivery-note/header.html`
- `src/modules/reporting/templates/delivery-note/body.html`
- `src/modules/reporting/templates/delivery-note/styles.css`

**CSS Reference:**
- [CSS Grid Guide](https://css-tricks.com/snippets/css/complete-guide-grid/)
- [Flexbox Guide](https://css-tricks.com/snippets/css/a-guide-to-flexbox/)
- [Color Picker](https://htmlcolorcodes.com/)

**Test Commands:**
```bash
node test-delivery-note.js          # Generate delivery note
node test-generate-report.js        # Generate project summary
```

---

## ✅ You Have Full Control!

Just like Google Sheets, you can:
- ✅ Edit HTML files to move elements
- ✅ Edit CSS files to change colors, spacing, fonts
- ✅ See results by regenerating the PDF
- ✅ No programming knowledge needed
- ✅ Pure visual design control

**The templates are YOUR canvas!** 🎨
