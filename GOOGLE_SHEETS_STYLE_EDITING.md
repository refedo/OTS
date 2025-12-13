# 🎨 Google Sheets-Style Report Editing

## 🎯 You Want Visual Control Like Google Sheets

I've created **TWO ways** for you to get Google Sheets-level freedom:

---

## ✅ Method 1: Live Visual Editor (EASIEST)

### Step 1: Open the Visual Editor
```
preview-delivery-note.html
```

Double-click this file to open it in your browser.

### Step 2: Use the Live Editor Panel (Right Side)

You'll see controls for:
- 🎨 **Red Header Color** - Change building summary header
- 🎨 **Yellow Header Color** - Change percentage highlights
- 🎨 **Green Box Color** - Change project weight boxes
- 🎨 **Dark Table Header** - Change items table header
- 📏 **Header Padding** - Adjust spacing
- 📝 **Title Font Size** - Make title bigger/smaller

### Step 3: Click Color Pickers

- Click any color box
- Choose your color visually
- See changes **instantly** in the preview

### Step 4: Adjust Numbers

- Change padding (spacing)
- Change font sizes
- See results immediately

### Step 5: Click "Apply Changes"

Your changes appear live!

### Step 6: Copy Your Settings

Once you like what you see:
1. Note your color values
2. Open `src/modules/reporting/templates/delivery-note/styles.css`
3. Update the colors there
4. Generate PDF to see final result

---

## ✅ Method 2: Direct CSS Editing (FULL CONTROL)

### The Template Files Are Your "Spreadsheet"

```
src/modules/reporting/templates/delivery-note/
├── header.html    ← Move elements here
├── body.html      ← Add/remove sections here
├── styles.css     ← Change ALL visual styling here
└── footer.html    ← Edit footer here
```

### Quick Edits You Can Make:

#### 1. Change Any Color
**File:** `styles.css`

```css
/* Find this line: */
.building-summary-table thead tr.header-red {
  background: #E74C3C;  /* ← Change this to ANY color */
}

/* Examples: */
background: #0071BC;  /* Blue */
background: #00A651;  /* Green */
background: #FF5733;  /* Orange */
background: #9B59B6;  /* Purple */
```

#### 2. Make Things Bigger/Smaller
```css
/* Make header bigger */
.delivery-header {
  padding: 40px;  /* Was 20px */
}

/* Make title huge */
.document-title {
  font-size: 48pt;  /* Was 28pt */
}

/* Make table text bigger */
.items-table {
  font-size: 12pt;  /* Was 8pt */
}
```

#### 3. Move Elements Around
**File:** `header.html`

```html
<!-- BEFORE: Logo on left -->
<div class="delivery-header">
  <div class="header-left">
    <img src="..." class="company-logo" />
  </div>
  <div class="header-center">
    <h1>Delivery Note</h1>
  </div>
  <div class="header-right">
    <!-- Metadata -->
  </div>
</div>

<!-- AFTER: Logo on right -->
<div class="delivery-header">
  <div class="header-left">
    <!-- Metadata -->
  </div>
  <div class="header-center">
    <h1>Delivery Note</h1>
  </div>
  <div class="header-right">
    <img src="..." class="company-logo" />
  </div>
</div>
```

#### 4. Add New Sections
**File:** `body.html`

```html
<!-- Add anywhere in the body -->
<div style="background: #E8F5E9; padding: 20px; margin: 20px 0; border-radius: 8px;">
  <h2 style="color: #00A651;">Custom Section</h2>
  <p>Your custom content here</p>
  <table>
    <!-- Your custom table -->
  </table>
</div>
```

#### 5. Change Spacing
```css
/* More space between sections */
.building-summary-section {
  margin: 50px 0;  /* Was 20px */
}

/* Bigger table cells */
.items-table td {
  padding: 20px;  /* Was 8px */
}

/* More space in boxes */
.summary-box {
  padding: 30px;  /* Was 15px */
}
```

---

## 🚀 Workflow: Edit → Preview → Generate

### Step 1: Edit Template
Open `styles.css` and change something:
```css
.document-title {
  font-size: 36pt;  /* Make it bigger */
  color: #0071BC;   /* Make it blue */
}
```

### Step 2: Preview (Optional)
Open `preview-delivery-note.html` in browser to see rough preview

### Step 3: Generate PDF
```bash
node test-delivery-note.js
```

### Step 4: View Result
```
http://localhost:3000/outputs/reports/247/delivery-note-xxx.pdf
```

### Step 5: Repeat
Keep editing until perfect!

---

## 🎨 Color Reference from Your Image

Copy these exact colors:

```css
/* Header Colors */
--red-header: #E74C3C;        /* Building summary */
--yellow-highlight: #FFC000;  /* Percentage cells */
--green-box: #00A651;         /* Project weight */
--dark-table: #2C3E50;        /* Items table */

/* Backgrounds */
--light-gray: #F7F9FA;        /* Project info */
--table-stripe: #F2F2F2;      /* Alternating rows */
```

---

## 📐 Layout Tips

### Center Something
```css
.my-element {
  display: flex;
  justify-content: center;
  align-items: center;
}
```

### Make Two Columns
```css
.my-section {
  display: grid;
  grid-template-columns: 1fr 1fr;  /* 50% 50% */
  gap: 20px;
}
```

### Make Three Columns
```css
.my-section {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;  /* 33% 33% 33% */
  gap: 15px;
}
```

### Full Width
```css
.my-table {
  width: 100%;
}
```

### Fixed Width
```css
.my-box {
  width: 300px;
}
```

---

## 💡 Common Tasks

### Task: Make Red Header Blue
**File:** `styles.css`
```css
.building-summary-table thead tr.header-red {
  background: #0071BC;  /* Changed from #E74C3C */
}
```

### Task: Add More Padding to Header
**File:** `styles.css`
```css
.delivery-header {
  padding: 40px;  /* Changed from 20px */
}
```

### Task: Make Table Font Bigger
**File:** `styles.css`
```css
.items-table {
  font-size: 10pt;  /* Changed from 8pt */
}
```

### Task: Change Logo Size
**File:** `styles.css`
```css
.company-logo {
  height: 80px;  /* Changed from 60px */
}
```

### Task: Add Border to Boxes
**File:** `styles.css`
```css
.summary-box {
  border: 3px solid #000;  /* Add thick border */
}
```

---

## ✅ You Have FULL Control!

Just like Google Sheets:
- ✅ **Change colors** - Edit CSS color values
- ✅ **Move elements** - Edit HTML structure
- ✅ **Adjust spacing** - Edit padding/margin values
- ✅ **Change fonts** - Edit font-size values
- ✅ **Add sections** - Add HTML blocks
- ✅ **Remove sections** - Delete HTML blocks

**The templates are pure HTML/CSS - edit them like code, see results in PDF!**

---

## 🎯 Quick Start

1. **Open:** `preview-delivery-note.html` in browser
2. **Play:** Use color pickers and sliders
3. **Copy:** Note the values you like
4. **Edit:** Update `styles.css` with those values
5. **Generate:** Run `node test-delivery-note.js`
6. **View:** Check the PDF
7. **Repeat:** Until perfect!

---

## 📚 Files You Can Edit

| File | What It Controls |
|------|------------------|
| `styles.css` | ALL colors, spacing, fonts, sizes |
| `header.html` | Header layout and content |
| `body.html` | Main content sections |
| `footer.html` | Footer content |

**Edit these files = Full control like Google Sheets!** 🎨
