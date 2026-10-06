"""Part 6: Building websites."""

import os

from engine import CONTENT_W
from portfolio_files import INDEX_HTML, SCRIPT_JS, STYLE_CSS

HERE = os.path.dirname(os.path.abspath(__file__))


def build(b):
    b.part(
        "Part 6",
        "Building websites",
        "HTML for structure, CSS for style, JavaScript for behaviour. Then you'll build a real portfolio website and put it online for free.",
        [
            "What a website needs, and the difference between static and dynamic sites",
            "HTML: headings, text, links, images, lists, tables and forms",
            "CSS: colours, fonts, the box model, Flexbox, Grid and responsive design",
            "JavaScript: variables, functions, events and changing the page",
            "How to build a complete personal portfolio website",
            "How to publish your website online for free",
            "How backends make websites dynamic (Python Flask and Node.js)",
            "What to learn next: React, TypeScript and full-stack development",
        ],
    )

    # ------------------------------------------------------------------
    b.lesson("What does a website need?", label="Lesson 33")
    b.p("Every website you have ever visited is built from **three languages** working together:")
    b.table(
        ["Language", "Job", "House comparison"],
        [
            ["**HTML**", "The **structure** and content: headings, paragraphs, images, buttons", "The walls, rooms and doors"],
            ["**CSS**", "The **style**: colours, fonts, spacing, layout, animations", "The paint, furniture and decoration"],
            ["**JavaScript**", "The **behaviour**: what happens when you click, type or scroll", "The electricity: lights, doorbell, alarm"],
        ],
        widths=[1.4, 4.2, 2.6],
    )
    b.note("HTML and CSS are not really *programming* languages: they have no loops or decisions. HTML is a **markup** language and CSS is a **style sheet** language. JavaScript is the real programming language of the web.")
    b.h3("What you need to build a website")
    b.table(
        ["Need", "Tool", "Cost"],
        [
            ["Somewhere to write code", "**VS Code** (plus the free **Live Server** extension, which refreshes the page every time you save)", "Free"],
            ["Something to view it", "A **web browser**: Chrome, Firefox, Edge or Safari", "Free"],
            ["To put it online", "**Hosting**: a server that sends your files to visitors (GitHub Pages, Netlify, Vercel, Cloudflare Pages)", "Free for simple sites"],
            ["Your own address (optional)", "A **domain name** like `sara.dev`, bought from a registrar", "About $10–20 a year"],
        ],
        widths=[2.1, 4.8, 1.6],
    )
    b.h3("Static vs dynamic websites")
    b.table(
        ["", "Static website", "Dynamic website / web app"],
        [
            ["**What**", "The same files are sent to every visitor", "Pages are built for each user, with data from a database"],
            ["**Examples**", "Portfolios, restaurant menus, landing pages, documentation", "Instagram, YouTube, online shops, school portals"],
            ["**Needs**", "HTML, CSS, JavaScript", "All of that, **plus** a backend language, a database and a server"],
            ["**Logins and accounts?**", "No", "Yes"],
            ["**Hosting**", "Free and simple", "Free tiers exist; costs grow with users"],
        ],
        widths=[1.8, 3, 3.6],
    )
    b.p("You'll build a static site first, which is the right place to start. Lesson 39 shows how backends add the dynamic part.")
    b.h3("No-code website builders")
    b.p("Tools like **Wix**, **Squarespace**, **WordPress** and **Shopify** let people build websites without code. They're great for businesses that just need a site quickly. Learning to code gives you **full control**, lets you build things these tools can't, and is the skill that companies hire for.")
    b.h3("How a website project is organised")
    b.code(
        "my-website/\n├── index.html      ← the home page (always called index.html)\n├── style.css       ← the styles\n├── script.js       ← the JavaScript\n└── images/\n    └── photo.jpg",
        "text", label="FOLDER",
    )

    # ------------------------------------------------------------------
    b.lesson("HTML: the structure", label="Lesson 34")
    b.p("Create a folder called `my-website`, open it in VS Code, create a file called `index.html`, and type this:")
    b.code(
        '<!DOCTYPE html>\n<html lang="en">\n<head>\n    <meta charset="UTF-8">\n    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n    <title>My First Website</title>\n</head>\n<body>\n    <h1>Hello, world!</h1>\n    <p>This is my very first web page.</p>\n</body>\n</html>',
        "html",
    )
    b.p("Save it, then **double-click the file** to open it in your browser. Or, if you installed **Live Server**, right-click the file in VS Code and choose **Open with Live Server**.")
    b.table(
        ["Part", "What it does"],
        [
            ["`<!DOCTYPE html>`", "Tells the browser this is a modern HTML page"],
            ["`<html lang=\"en\">`", "Wraps the whole page, and says the language is English"],
            ["`<head>`", "Information **about** the page, which isn't shown on it: title, character set, links to CSS"],
            ["`<meta name=\"viewport\" ...>`", "Makes the page display properly on phones"],
            ["`<title>`", "The text on the browser tab"],
            ["`<body>`", "Everything you **see** on the page"],
        ],
        widths=[2.8, 5],
    )
    b.h3("Anatomy of an HTML element")
    b.code('<a href="https://wikipedia.org" class="link">Visit Wikipedia</a>', "html")
    b.bullets([
        "`<a ...>` is the **opening tag**, and `</a>` is the **closing tag** (note the `/`).",
        "`href=\"...\"` and `class=\"...\"` are **attributes**: extra settings for the element.",
        "`Visit Wikipedia` is the **content**: what the user sees.",
        "Some elements have no content and no closing tag, such as `<img>`, `<br>` and `<input>`.",
    ])
    b.h3("The tags you'll use most")
    b.table(
        ["Tag", "What it's for"],
        [
            ["`<h1>` to `<h6>`", "Headings, from the most important (`h1`, use one per page) to the least"],
            ["`<p>`", "A paragraph of text"],
            ["`<a href=\"...\">`", "A link to another page or site"],
            ["`<img src=\"...\" alt=\"...\">`", "An image. `alt` describes it for blind users and search engines"],
            ["`<ul>`, `<ol>`, `<li>`", "Bullet lists, numbered lists, and the items in them"],
            ["`<strong>`, `<em>`", "Important (bold) and emphasised (italic) text"],
            ["`<button>`", "A clickable button"],
            ["`<form>`, `<input>`, `<label>`, `<textarea>`", "Forms that users type into"],
            ["`<table>`, `<tr>`, `<th>`, `<td>`", "Tables: rows, header cells, data cells"],
            ["`<div>`, `<span>`", "Boxes with no meaning, used for grouping and styling"],
            ["`<header>`, `<nav>`, `<main>`, `<section>`, `<article>`, `<footer>`", "**Semantic** boxes that describe what each part of the page *is*"],
        ],
        widths=[3.4, 5],
    )
    b.h3("Text, links and images")
    b.code(
        '<h1>My Favourite Animals</h1>\n<p>Cats are <strong>amazing</strong>. They sleep about <em>15 hours</em> a day.</p>\n\n<a href="https://en.wikipedia.org/wiki/Cat">Read more about cats</a>\n\n<img src="images/cat.jpg" alt="An orange cat sleeping in the sun" width="300">',
        "html",
    )
    b.h3("Lists")
    b.code(
        '<h2>My skills</h2>\n<ul>\n    <li>Python</li>\n    <li>HTML</li>\n    <li>CSS</li>\n</ul>\n\n<h2>Morning routine</h2>\n<ol>\n    <li>Wake up</li>\n    <li>Breakfast</li>\n    <li>Code for 30 minutes</li>\n</ol>',
        "html",
    )
    b.h3("Forms")
    b.code(
        '<form>\n    <label for="email">Email:</label>\n    <input type="email" id="email" name="email" placeholder="you@example.com" required>\n\n    <label for="level">Your level:</label>\n    <select id="level" name="level">\n        <option>Beginner</option>\n        <option>Intermediate</option>\n    </select>\n\n    <button type="submit">Subscribe</button>\n</form>',
        "html",
    )
    b.p("`type=\"email\"` makes the browser check that it looks like an email address, and `required` stops the form being sent while the field is empty. Other useful types are `text`, `password`, `number`, `date`, `checkbox` and `radio`.")
    b.h3("Semantic page layout")
    b.code(
        '<body>\n    <header>\n        <nav>\n            <a href="#about">About</a>\n            <a href="#contact">Contact</a>\n        </nav>\n    </header>\n\n    <main>\n        <section id="about">\n            <h2>About me</h2>\n            <p>...</p>\n        </section>\n    </main>\n\n    <footer>\n        <p>&copy; 2026 Sara</p>\n    </footer>\n</body>',
        "html",
    )
    b.p("A link to `#about` jumps to the element with `id=\"about\"`. `&copy;` is an **HTML entity** that shows the © symbol.")
    b.tip("**Right-click any website and choose Inspect** (or press F12). This opens the browser's **DevTools**, where you can see and even live-edit the HTML and CSS of any site. It's the best way to learn how websites are built.")
    b.tryit([
        "Make an \"About me\" page with a heading, two paragraphs, a photo and a list of your hobbies.",
        "Add a table of your weekly timetable (days as columns).",
        "Create a second page, `games.html`, and link the two pages to each other.",
        "Build a sign-up form with name, email, password, a date of birth field and a checkbox for \"I agree to the rules\".",
    ])

    # ------------------------------------------------------------------
    b.lesson("CSS: the style", label="Lesson 35")
    b.p("CSS decides how HTML looks. Put your CSS in a separate file, `style.css`, and connect it inside the `<head>` of your HTML:")
    b.code('<link rel="stylesheet" href="style.css">', "html")
    b.h3("Anatomy of a CSS rule")
    b.code("h1 {\n    color: navy;\n    font-size: 40px;\n    text-align: center;\n}", "css")
    b.p("`h1` is the **selector** (which elements to style). Inside the curly brackets are **declarations**: a **property**, a colon, a **value**, and a semicolon.")
    b.h3("Selectors: choosing what to style")
    b.table(
        ["Selector", "Selects", "HTML it matches"],
        [
            ["`p`", "Every `<p>` element", "`<p>`"],
            ["`.card`", "Every element with the **class** `card` (a class can be used many times)", "`<div class=\"card\">`"],
            ["`#header`", "The one element with the **id** `header` (an id is unique)", "`<header id=\"header\">`"],
            ["`nav a`", "Every `<a>` that is **inside** a `<nav>`", ""],
            ["`a:hover`", "Links while the mouse is over them", ""],
            ["`h1, h2`", "Both `h1` and `h2` elements", ""],
        ],
        widths=[1.4, 4.4, 2.5],
    )
    b.h3("Colours and fonts")
    b.code('body {\n    font-family: "Segoe UI", Arial, sans-serif;  /* first one that exists wins */\n    color: #1f2937;                              /* text colour (hex code) */\n    background-color: rgb(249, 250, 251);        /* the same idea, as red, green, blue */\n    line-height: 1.6;                            /* space between lines */\n}\n\n.highlight {\n    color: tomato;                               /* 140+ colour names exist */\n    font-weight: bold;\n}', "css")
    b.tip("Free fonts: **Google Fonts** (fonts.google.com). Pick a font, copy the `<link>` code into your `<head>`, and use its name in `font-family`. Colour palettes: **coolors.co**.")
    b.h3("The box model: the most important idea in CSS")
    b.p("Every element is a **rectangle** made of four layers:")
    b.code(
        "┌──────────────────────── margin ─────────────────────────┐\n"
        "│   (space OUTSIDE the border, pushes other boxes away)   │\n"
        "│  ┌─────────────────────── border ────────────────────┐  │\n"
        "│  │  ┌───────────────────── padding ───────────────┐  │  │\n"
        "│  │  │   (space INSIDE the border)                 │  │  │\n"
        "│  │  │        ┌─────────────────────────┐          │  │  │\n"
        "│  │  │        │  content: text, images  │          │  │  │\n"
        "│  │  │        └─────────────────────────┘          │  │  │\n"
        "│  │  └─────────────────────────────────────────────┘  │  │\n"
        "│  └───────────────────────────────────────────────────┘  │\n"
        "└─────────────────────────────────────────────────────────┘",
        "text", label="THE BOX MODEL",
    )
    b.code(".card {\n    padding: 20px;              /* space inside */\n    border: 2px solid #e5e7eb;  /* the edge */\n    margin: 16px;               /* space outside */\n    border-radius: 12px;        /* rounded corners */\n    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);\n}", "css")
    b.tip("Start every stylesheet with `* { box-sizing: border-box; }`. It makes widths include the padding and border, which is much easier to reason about.")
    b.h3("Units")
    b.table(
        ["Unit", "Meaning", "Use it for"],
        [
            ["`px`", "Pixels: a fixed size", "Borders, small details"],
            ["`rem`", "Relative to the root font size (usually 1rem = 16px)", "Font sizes, spacing"],
            ["`%`", "A percentage of the parent element", "Widths"],
            ["`vw` / `vh`", "1% of the screen's width / height", "Full-screen sections"],
            ["`fr`", "A fraction of the free space (only in Grid)", "Grid columns"],
        ],
        widths=[1.2, 3.8, 2.8],
    )
    b.h3("Layout with Flexbox (one direction)")
    b.p("**Flexbox** arranges items in a **row** or a **column**. It's perfect for navigation bars, buttons in a row and centring things.")
    b.code(".navbar {\n    display: flex;\n    justify-content: space-between;  /* spread out along the row */\n    align-items: center;             /* centre vertically */\n    gap: 20px;                       /* space between items */\n}\n\n.center-everything {\n    display: flex;\n    justify-content: center;\n    align-items: center;\n    height: 100vh;\n}", "css")
    b.h3("Layout with Grid (rows and columns)")
    b.code(".gallery {\n    display: grid;\n    grid-template-columns: repeat(3, 1fr);   /* 3 equal columns */\n    gap: 16px;\n}", "css")
    b.h3("Responsive design: looking good on phones")
    b.p("More than half of web traffic comes from phones, so your site must adapt to small screens. A **media query** applies CSS only when the screen fits a condition:")
    b.code("@media (max-width: 700px) {\n    .gallery {\n        grid-template-columns: 1fr;   /* 1 column on small screens */\n    }\n}", "css")
    b.tip("In DevTools (F12), click the **phone and tablet icon** to preview your site at different screen sizes.")
    b.h3("Hover effects and animation")
    b.code(".button {\n    background: #2563eb;\n    color: white;\n    padding: 12px 24px;\n    border-radius: 8px;\n    transition: transform 0.2s, background 0.2s;   /* animate changes */\n}\n\n.button:hover {\n    background: #1d4ed8;\n    transform: scale(1.05);\n}", "css")
    b.note("Once you're comfortable with CSS, you might try a CSS framework. **Tailwind CSS** (very popular now) and **Bootstrap** give you ready-made styles. Learn plain CSS first, though, so you understand what they do.")
    b.tryit([
        "Style your About page: pick a font from Google Fonts, a background colour and a text colour.",
        "Make a \"card\" with padding, rounded corners and a shadow, that lifts up when you hover over it.",
        "Build a navigation bar with Flexbox: logo on the left, links on the right.",
        "Make a gallery with 3 columns on a computer and 1 column on a phone.",
    ])

    # ------------------------------------------------------------------
    b.lesson("JavaScript: the behaviour", label="Lesson 36")
    b.p("JavaScript makes pages **interactive**. Connect a file called `script.js` at the end of the `<body>`, just before `</body>`:")
    b.code('<script src="script.js"></script>', "html")
    b.h3("Your first JavaScript, in the console")
    b.p("Open DevTools (F12) and click the **Console** tab. You can type JavaScript there and see the results instantly. `console.log()` is JavaScript's `print()`:")
    b.code('console.log("Hello from JavaScript!");\nconsole.log(2 + 3);', "javascript")
    b.h3("Variables: const and let")
    b.code('const name = "Sara";   // const: cannot be reassigned\nlet score = 0;         // let: can change\nscore = score + 10;\nconsole.log(`${name} has ${score} points`);   // a template string, like an f-string', "javascript")
    b.out("Sara has 10 points", test=False)
    b.tip("Use `const` by default, and `let` only when the value must change. You will see `var` in old code. Don't use it in new code.")
    b.h3("Python vs JavaScript: a translation table")
    b.p("You already know the ideas, so this is mostly new spelling:")
    b.table(
        ["Python", "JavaScript"],
        [
            ["`print(\"hi\")`", "`console.log(\"hi\");`"],
            ["`name = \"Sara\"`", "`const name = \"Sara\";` or `let name = \"Sara\";`"],
            ["`f\"Hi {name}\"`", "`{bt}Hi ${name}{bt}` (backtick quotes)"],
            ["`True`, `False`, `None`", "`true`, `false`, `null` (and `undefined`)"],
            ["`and`, `or`, `not`", "`&&`, `||`, `!`"],
            ["`==`", "`===` (always use three equals signs)"],
            ["`if x > 5:` with indentation", "`if (x > 5) { ... }` with curly brackets"],
            ["`elif`", "`else if`"],
            ["`for item in items:`", "`for (const item of items) { ... }`"],
            ["`for i in range(5):`", "`for (let i = 0; i < 5; i++) { ... }`"],
            ["`def add(a, b):`", "`function add(a, b) { ... }` or `const add = (a, b) => a + b;`"],
            ["`len(items)`", "`items.length`"],
            ["`items.append(x)`", "`items.push(x)`"],
            ["list `[1, 2]`", "array `[1, 2]`"],
            ["dict `{\"name\": \"Sara\"}`", "object `{ name: \"Sara\" }`"],
            ["`# comment`", "`// comment`"],
        ],
        widths=[3.5, 4.8], font_size=8.6,
    )
    b.warn("In JavaScript, `==` tries to convert types first, so `\"5\" == 5` is `true`! Always use `===`, which checks the type too. `\"5\" === 5` is `false`.")
    b.h3("Decisions, loops and functions")
    b.code('const age = 16;\nif (age >= 18) {\n    console.log("Adult");\n} else {\n    console.log("Not an adult yet");\n}\n\nconst fruits = ["apple", "banana", "cherry"];\nfor (const fruit of fruits) {\n    console.log(fruit);\n}\n\nfunction add(a, b) {\n    return a + b;\n}\nconst multiply = (a, b) => a * b;   // an "arrow function"\nconsole.log(add(2, 3), multiply(2, 3));', "javascript")
    b.out("Not an adult yet\napple\nbanana\ncherry\n5 6", test=False)
    b.h3("Objects and arrays")
    b.code('const student = { name: "Sara", age: 16, skills: ["HTML", "CSS"] };\nconsole.log(student.name);\nstudent.skills.push("JavaScript");\nconsole.log(student.skills.length);\n\nconst scores = [72, 88, 95];\nconst doubled = scores.map((s) => s * 2);          // like a list comprehension\nconst high = scores.filter((s) => s > 80);\nconsole.log(doubled, high);', "javascript")
    b.out("Sara\n3\n[ 144, 176, 190 ] [ 88, 95 ]", test=False)
    b.h3("The DOM: changing the page with JavaScript")
    b.p("The browser turns your HTML into a tree of objects called the **DOM** (Document Object Model). JavaScript can find elements in it, change them, and react to **events** like clicks and key presses.")
    b.code('<h1 id="count">0</h1>\n<button id="add-btn">Click me!</button>\n<script src="script.js"></script>', "html")
    b.code('const countText = document.querySelector("#count");   // find elements\nconst button = document.querySelector("#add-btn");\nlet count = 0;\n\nbutton.addEventListener("click", () => {   // run this on every click\n    count++;\n    countText.textContent = count;           // change the page\n});', "javascript")
    b.p("That's the core pattern of all interactive websites: **find an element, listen for an event, change something**.")
    b.table(
        ["Code", "What it does"],
        [
            ["`document.querySelector(\".card\")`", "Find the first element matching a CSS selector"],
            ["`document.querySelectorAll(\"li\")`", "Find all matching elements"],
            ["`el.textContent = \"Hi\"`", "Change the text"],
            ["`el.style.color = \"red\"`", "Change a style"],
            ["`el.classList.add(\"dark\")` / `.remove` / `.toggle`", "Add, remove or switch a CSS class (the best way to change styles)"],
            ["`input.value`", "What the user typed in an input box"],
            ["`document.createElement(\"li\")`, `list.append(li)`", "Create a new element and add it to the page"],
            ["`el.addEventListener(\"click\", fn)`", "Run `fn` when the event happens (also `\"input\"`, `\"submit\"`, `\"keydown\"`)"],
        ],
        widths=[4, 4.3],
    )
    b.h3("Getting data from an API with fetch")
    b.code('async function loadUser() {\n    const response = await fetch("https://api.github.com/users/octocat");\n    const data = await response.json();\n    document.querySelector("#name").textContent = data.name;\n}\n\nloadUser();', "javascript")
    b.p("`async` and `await` let JavaScript **wait** for slow things, like network requests, without freezing the page.")
    b.note("JavaScript can also run **outside** the browser, using **Node.js** (nodejs.org). With Node, you can run `node script.js` in the terminal, just like `python script.py`. Node is how JavaScript is used to build servers (Lesson 39).")
    b.tryit([
        "Make a page with an input box and a button. When clicked, show `Hello, <name>!` on the page.",
        "Make a button that changes the page's background to a random colour each time it's clicked.",
        "Build a browser to-do list: type a task, click Add, and it appears in a `<ul>`. Bonus: click a task to cross it out.",
        "Build a simple calculator with two inputs and buttons for +, −, × and ÷.",
    ])

    # ------------------------------------------------------------------
    b.lesson("Project: your portfolio website", label="Lesson 37 · Project 4", new_page=True)
    b.p("Now you'll build a real personal website that you can show to anyone: a teacher, a friend, or a future employer. It has a navigation bar, an introduction, an about section, project cards, a contact form, **dark mode** that remembers your choice, and a **responsive** layout that works on phones.")
    b.image(os.path.join(HERE, "assets", "portfolio.jpg"), CONTENT_W,
            caption="The finished site: light mode on a computer (left) and dark mode on a phone (right).")
    b.p("Create a folder called `portfolio` with three files. Replace Sara's details with your own!")
    b.code(INDEX_HTML, "html", label="HTML  ·  index.html", keep=False)
    b.code(STYLE_CSS, "css", label="CSS  ·  style.css", keep=False)
    b.code(SCRIPT_JS, "javascript", label="JAVASCRIPT  ·  script.js", keep=False)
    b.h3("What makes this code good")
    b.bullets([
        "**CSS variables** (`--bg`, `--text`, `--accent`) hold all the colours in one place. Dark mode just swaps the variables by adding a `dark` class to `<body>`.",
        "**localStorage** saves the visitor's theme choice in their browser, so it's remembered next time.",
        "**Semantic HTML** (`header`, `nav`, `main`, `section`, `article`, `footer`) helps search engines and screen readers.",
        "**Flexbox** for the navbar and skills, **Grid** for the cards, and a **media query** for phones.",
    ])
    b.box("try", "Make it truly yours:", title="Challenges", items=[
        "Add your own projects, a photo of yourself (or an avatar) and links to your GitHub.",
        "Add a \"Skills\" bar chart made only from `div`s and CSS widths.",
        "Make the navigation bar stick to the top while scrolling (look up `position: sticky`).",
        "Make the contact form really send messages, using a free form service such as Formspree.",
    ])

    # ------------------------------------------------------------------
    b.lesson("Publish your website for free", label="Lesson 38")
    b.h3("Option 1: GitHub Pages")
    b.steps([
        "Create a free account on **github.com** (if you don't have one).",
        "Create a new **public** repository named exactly `YOUR-USERNAME.github.io`.",
        "Click **Add file > Upload files**, and drag in `index.html`, `style.css`, `script.js` and any images. Click **Commit changes**. (Or push them with Git, as in Lesson 26.)",
        "Go to the repository's **Settings > Pages**. Under *Build and deployment*, choose **Deploy from a branch**, pick the `main` branch and the `/ (root)` folder, and click **Save**.",
        "Wait a minute or two, then visit **https://YOUR-USERNAME.github.io**. Your site is live, for anyone in the world!",
    ])
    b.h3("Option 2: Netlify, Vercel or Cloudflare Pages")
    b.p("Sign up for free, then either **drag and drop** your project folder onto the site, or connect your GitHub repository. Connecting GitHub means that every time you `git push`, your website updates automatically.")
    b.h3("Your own domain name (optional)")
    b.p("Instead of `sara.github.io` you can have `sara.dev`. Buy a domain from a registrar (for example Cloudflare, Namecheap or Porkbun). Prices are usually around $10–20 a year. Then follow your host's \"custom domain\" instructions to connect it. HTTPS is set up for you for free.")
    b.h3("Checklist before you share your site")
    b.bullets([
        "The page has a good `<title>`, and every image has `alt` text",
        "It looks good on a phone (check with DevTools device mode)",
        "Every link works, and there are no errors in the Console",
        "No passwords, keys or private information are in the files",
        "Run **Lighthouse** (in Chrome DevTools) for a score on speed, accessibility and SEO",
    ], check=True)

    # ------------------------------------------------------------------
    b.lesson("Backends: making websites dynamic", label="Lesson 39")
    b.p("A static site sends the same files to everyone. To have **user accounts, saved data, search or payments**, you need a **backend**: code running on a server that receives requests, uses a database, and sends back responses.")
    b.code(
        "  BROWSER (frontend)                 SERVER (backend)                 DATABASE\n"
        " HTML + CSS + JavaScript  ──request──►  Python / Node.js / ...  ──SQL──►  PostgreSQL\n"
        "                          ◄─response──  (rules, logins, logic)  ◄─data──",
        "text", label="HOW A DYNAMIC WEBSITE WORKS",
    )
    b.h3("A Python backend with Flask")
    b.p("Install Flask with `python -m pip install flask`, then create `app.py`:")
    b.code('from flask import Flask\nfrom markupsafe import escape\n\napp = Flask(__name__)\n\n\n@app.route("/")\ndef home():\n    return "<h1>Hello from Python!</h1>"\n\n\n@app.route("/hello/<name>")\ndef hello(name):\n    return f"<h1>Hello, {escape(name)}!</h1>"\n\n\n@app.route("/api/tasks")\ndef tasks():\n    return {"tasks": ["Learn HTML", "Learn CSS", "Learn JavaScript"]}\n\n\nif __name__ == "__main__":\n    app.run(debug=True)', label="PYTHON  ·  app.py")
    b.p("Run `python app.py` and open **http://127.0.0.1:5000** in your browser. Then try **/hello/Sara** and **/api/tasks**.")
    b.bullets([
        "`@app.route(\"/\")` is a **decorator**. It connects a URL to a function. When someone visits that URL, the function runs and its return value is sent back.",
        "`<name>` in the route captures part of the URL as a variable.",
        "Returning a dictionary sends **JSON**. That's how you build an API that your JavaScript can `fetch()`.",
        "`escape(name)` is a **security** step. Without it, someone could put JavaScript into the URL and run it on your page (an **XSS** attack, see Lesson 30).",
    ])
    b.p("Your frontend JavaScript can then show the data from your own API:")
    b.code('const response = await fetch("/api/tasks");\nconst data = await response.json();\nfor (const task of data.tasks) {\n    const li = document.createElement("li");\n    li.textContent = task;\n    document.querySelector("#task-list").append(li);\n}', "javascript")
    b.h3("The same backend in JavaScript, with Node.js and Express")
    b.code("npm init -y\nnpm install express", "bash")
    b.code('const express = require("express");\nconst app = express();\n\napp.get("/", (req, res) => {\n    res.send("<h1>Hello from Node.js!</h1>");\n});\n\napp.get("/api/tasks", (req, res) => {\n    res.json({ tasks: ["Learn HTML", "Learn CSS", "Learn JavaScript"] });\n});\n\napp.listen(3000, () => {\n    console.log("Server running at http://localhost:3000");\n});', "javascript", label="JAVASCRIPT  ·  server.js")
    b.p("Run it with `node server.js`, then open **http://localhost:3000**.")
    b.h3("Backend choices")
    b.table(
        ["Language", "Popular frameworks", "Known for"],
        [
            ["**Python**", "**Django** (everything built in), **Flask** (small and simple), **FastAPI** (fast, modern APIs)", "Easy to learn; great if your app also uses data or AI"],
            ["**JavaScript / TypeScript**", "**Express**, **Next.js**, **NestJS**", "One language for frontend and backend"],
            ["**PHP**", "**Laravel**, **WordPress**", "Powers a huge part of the web"],
            ["**Java / Kotlin**", "**Spring Boot**", "Big companies and banks"],
            ["**C#**", "**ASP.NET Core**", "Microsoft-based companies"],
            ["**Go**", "Built-in `net/http`, **Gin**", "Fast, simple servers and cloud tools"],
            ["**Ruby**", "**Ruby on Rails**", "Building products quickly"],
        ],
        widths=[1.9, 3.8, 2.6],
    )
    b.h3("Putting a backend online")
    b.p("Backends need a server that is always running. Beginner-friendly hosts include **Render**, **Railway**, **Fly.io** and **PythonAnywhere** (for Python). Many have free or very cheap plans for small projects.")

    # ------------------------------------------------------------------
    b.lesson("Levelling up as a web developer", label="Lesson 40")
    b.h3("Frontend frameworks")
    b.p("When websites become big apps (like Gmail or Spotify's web player), managing the DOM by hand gets messy. **Frameworks** let you build the page from reusable **components** and update it automatically when data changes.")
    b.table(
        ["Framework", "Notes"],
        [
            ["**React**", "The most used. Made by Meta. Huge job market"],
            ["**Next.js**", "Built on React. Adds pages, routing and a backend: a full-stack framework"],
            ["**Vue**", "Friendly and easy to learn"],
            ["**Angular**", "Large and structured. Popular in big companies"],
            ["**Svelte**", "Very simple, fast and loved by developers"],
        ],
        widths=[1.6, 6.5],
    )
    b.p("A React component that counts clicks (compare it with the DOM version in Lesson 36):")
    b.code('import { useState } from "react";\n\nfunction Counter() {\n    const [count, setCount] = useState(0);\n\n    return (\n        <button onClick={() => setCount(count + 1)}>\n            Clicked {count} times\n        </button>\n    );\n}\n\nexport default Counter;', "jsx", label="JAVASCRIPT (REACT)")
    b.p("To start a React project, install Node.js, then run:")
    b.code("npm create vite@latest my-app -- --template react\ncd my-app\nnpm install\nnpm run dev", "bash")
    b.h3("TypeScript")
    b.p("**TypeScript** is JavaScript with **types**. You say what kind of value each variable holds, and the editor catches mistakes before you run the code. Most professional JavaScript projects now use TypeScript. Learn it after you're comfortable with JavaScript.")
    b.code('function greet(name: string): string {\n    return `Hello, ${name}!`;\n}\n\ngreet(42);   // error before running: 42 is not a string', "typescript")
    b.h3("The web developer roadmap")
    b.steps([
        "HTML and CSS (including Flexbox, Grid and responsive design)",
        "JavaScript and the DOM",
        "Git and GitHub",
        "Build and publish 3 to 5 projects",
        "A framework: React (or Vue or Svelte)",
        "TypeScript",
        "A backend: Node.js/Express or Python/Django/FastAPI, plus SQL and a database",
        "Authentication, security and deployment",
        "Testing, and performance and accessibility",
    ])
