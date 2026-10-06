"""Part 7: Building apps."""


def build(b):
    b.part(
        "Part 7",
        "Building apps",
        "Websites vs apps, mobile apps for iPhone and Android, desktop apps, web apps and games: what each one needs, how to build it and how to publish it.",
        [
            "The real differences between a website, a web app and an app",
            "Native vs cross-platform mobile apps, and what each requires",
            "The same app written in SwiftUI, Kotlin, Flutter and React Native",
            "How to build and run your first mobile app on your own phone",
            "How to build desktop apps, starting with Python",
            "Progressive web apps (PWAs): apps you install from a website",
            "How games are made, with a small game in Python",
            "Everything an app needs, and how to publish to the App Store and Google Play",
        ],
    )

    # ------------------------------------------------------------------
    b.lesson("Websites vs apps: what's the difference?", label="Lesson 41")
    b.p("People use the word \"app\" for many different things. Here are the main kinds of software you can build, side by side:")
    b.table(
        ["", "Website", "Web app", "Mobile app", "Desktop app", "Game"],
        [
            ["**Example**", "A restaurant site, a portfolio", "Gmail, Google Docs, Canva", "WhatsApp, TikTok, Duolingo", "VS Code, Photoshop, Spotify", "Minecraft, Among Us"],
            ["**Runs in**", "A web browser", "A web browser", "iPhone / Android", "Windows / Mac / Linux", "Console, PC, phone or browser"],
            ["**Install?**", "No, just visit the URL", "No (optionally installable as a PWA)", "Yes, from an app store", "Yes, download or store", "Yes, usually"],
            ["**Main languages**", "HTML, CSS, JS", "HTML, CSS, JS/TS + a backend", "Swift, Kotlin, Dart, JS/TS", "C#, C++, JS, Python, Swift", "C#, C++, GDScript, Lua"],
            ["**Works offline?**", "Usually not", "Partly (PWAs)", "Often", "Yes", "Usually"],
            ["**Uses phone features** (camera, GPS, notifications)", "A few", "Some", "All of them", "Computer features", "Controllers, graphics card"],
            ["**Cost to publish**", "Free", "Free to cheap", "$25 once (Google) / $99 a year (Apple)", "Free (own website) or store fee", "Free (itch.io) or $100 per game (Steam)"],
            ["**Updating**", "Instantly for everyone", "Instantly for everyone", "New version, store review, users update", "Users download updates", "Patches"],
        ],
        widths=[1.5, 1.4, 1.5, 1.6, 1.6, 1.5], font_size=8,
    )
    b.key("**A website** mainly shows information. **A web app** is a website you *use* to get something done, with accounts and saved data. **An app** usually means software **installed** on a phone or computer. Most big products (Spotify, Instagram, Discord) have all three, and they share the same **backend**.")
    b.h3("What do they have in common?")
    b.p("Almost every modern app, website or game is made of the same layers you met in Part 5:")
    b.code(
        "   FRONTEND (what users see)              BACKEND (shared)            DATA\n"
        "  ┌───────────────────────┐\n"
        "  │ Website / web app     │──┐\n"
        "  ├───────────────────────┤  │       ┌──────────────────────┐    ┌──────────┐\n"
        "  │ iPhone app            │──┼─API──►│ Server code: logins, │───►│ Database │\n"
        "  ├───────────────────────┤  │       │ rules, payments      │    └──────────┘\n"
        "  │ Android app           │──┤       └──────────────────────┘\n"
        "  ├───────────────────────┤  │\n"
        "  │ Desktop app           │──┘\n"
        "  └───────────────────────┘",
        "text", label="ONE BACKEND, MANY FRONTENDS",
    )
    b.p("So everything you learnt about Python, APIs, databases and security is useful **whatever** you build. Only the frontend changes.")
    b.h3("Which should I build first?")
    b.table(
        ["If you want...", "Start with"],
        [
            ["Something online that anyone can open quickly", "A **website** (Part 6)"],
            ["A tool with accounts and saved data", "A **web app**: website + backend"],
            ["Something in people's pockets, using the camera or GPS", "A **mobile app** (Lessons 42–44)"],
            ["A tool for your own computer, or for offices", "A **desktop app** (Lesson 45)"],
            ["To make games", "A **game engine** (Lesson 47)"],
        ],
        widths=[4.2, 4],
    )
    b.tip("For most beginners, the best order is **website first, then app**. Web skills (HTML, CSS, JavaScript) transfer directly to React Native and other app frameworks, and websites are free and instant to publish.")

    # ------------------------------------------------------------------
    b.lesson("Mobile apps: native vs cross-platform", label="Lesson 42")
    b.p("There are two operating systems for phones: **iOS** (iPhone and iPad, by Apple) and **Android** (Samsung, Google Pixel, Xiaomi and most others). Worldwide, about 70% of phones run Android. In some countries, like the USA, iPhones are more common. You can build for them in two ways:")
    b.table(
        ["", "Native apps", "Cross-platform apps"],
        [
            ["**What**", "A separate app for each platform, in its official language", "One codebase that runs on both iOS and Android"],
            ["**Languages**", "**Swift** for iOS, **Kotlin** for Android", "**Dart** (Flutter), **JavaScript/TypeScript** (React Native), **C#** (.NET MAUI), **Kotlin** (Kotlin Multiplatform)"],
            ["**Pros**", "Best performance; newest phone features first; feels exactly right on each phone", "Write once, run on both; one team; faster and cheaper"],
            ["**Cons**", "Two codebases, so twice the work", "Slightly less control; some features need extra plugins"],
            ["**Used by**", "Apple's own apps, many banking and big-company apps", "Many startups; parts of apps from companies like Meta, Google, Microsoft and Shopify"],
        ],
        widths=[1.3, 3.3, 3.6],
    )
    b.h3("What you need for each option")
    b.table(
        ["Option", "Language", "Editor / IDE", "Computer needed", "Test on"],
        [
            ["**iOS native**", "Swift + SwiftUI", "**Xcode** (free)", "**A Mac** (Xcode only runs on macOS)", "iOS Simulator, your iPhone"],
            ["**Android native**", "Kotlin + Jetpack Compose", "**Android Studio** (free)", "Windows, Mac or Linux", "Android Emulator, your Android phone"],
            ["**Flutter**", "Dart", "VS Code or Android Studio", "Any (a Mac to build iOS versions)", "Emulator, simulator or phone"],
            ["**React Native** (with **Expo**)", "JavaScript / TypeScript", "VS Code", "Any (Expo can build iOS apps in the cloud)", "The **Expo Go** app on your own phone"],
            ["**.NET MAUI**", "C#", "Visual Studio, VS Code", "Windows or Mac", "Emulator or phone"],
            ["**No-code / blocks**", "None (blocks or drag and drop)", "MIT App Inventor, FlutterFlow, Thunkable", "Any computer with a browser", "A companion app on your phone"],
        ],
        widths=[1.7, 1.6, 1.8, 2.2, 1.9], font_size=8.4,
    )
    b.h3("Which one should you choose?")
    b.bullets([
        "**You know JavaScript (after Part 6):** React Native with Expo. You can test on your own phone within minutes.",
        "**You want beautiful apps and a single, clean toolkit:** Flutter. Dart is easy if you know Python or JavaScript.",
        "**You only care about iPhones and have a Mac:** Swift with SwiftUI.",
        "**You only care about Android, or want an Android job:** Kotlin with Jetpack Compose.",
        "**You want to try app-making today, with no typing:** MIT App Inventor (appinventor.mit.edu), which uses blocks like Scratch.",
    ])

    # ------------------------------------------------------------------
    b.lesson("One app, four frameworks", label="Lesson 43")
    b.p("Here is the **same app**, a counter with a button, written for each major mobile platform. Notice how similar the ideas are: a piece of **state** (`count`), a **text** that shows it, and a **button** that changes it. When the state changes, the screen updates automatically. This idea is called **declarative UI**, and every modern app framework uses it.")
    b.h3("iOS: Swift and SwiftUI (in Xcode)")
    b.code('import SwiftUI\n\nstruct ContentView: View {\n    @State private var count = 0\n\n    var body: some View {\n        VStack(spacing: 16) {\n            Text("You tapped \\(count) times")\n                .font(.title)\n            Button("Tap me") {\n                count += 1\n            }\n            .buttonStyle(.borderedProminent)\n        }\n    }\n}', "swift")
    b.h3("Android: Kotlin and Jetpack Compose (in Android Studio)")
    b.code('@Composable\nfun Counter() {\n    var count by remember { mutableStateOf(0) }\n\n    Column(horizontalAlignment = Alignment.CenterHorizontally) {\n        Text("You tapped $count times", fontSize = 24.sp)\n        Button(onClick = { count++ }) {\n            Text("Tap me")\n        }\n    }\n}', "kotlin")
    b.h3("Both platforms: Flutter and Dart")
    b.code("import 'package:flutter/material.dart';\n\nvoid main() => runApp(const MaterialApp(home: CounterPage()));\n\nclass CounterPage extends StatefulWidget {\n  const CounterPage({super.key});\n\n  @override\n  State<CounterPage> createState() => _CounterPageState();\n}\n\nclass _CounterPageState extends State<CounterPage> {\n  int count = 0;\n\n  @override\n  Widget build(BuildContext context) {\n    return Scaffold(\n      body: Center(\n        child: Text('You tapped $count times',\n            style: const TextStyle(fontSize: 24)),\n      ),\n      floatingActionButton: FloatingActionButton(\n        onPressed: () => setState(() => count++),\n        child: const Icon(Icons.add),\n      ),\n    );\n  }\n}", "dart")
    b.h3("Both platforms: React Native (JavaScript)")
    b.code('import { useState } from "react";\nimport { Button, StyleSheet, Text, View } from "react-native";\n\nexport default function App() {\n  const [count, setCount] = useState(0);\n\n  return (\n    <View style={styles.container}>\n      <Text style={styles.title}>You tapped {count} times</Text>\n      <Button title="Tap me" onPress={() => setCount(count + 1)} />\n    </View>\n  );\n}\n\nconst styles = StyleSheet.create({\n  container: { flex: 1, alignItems: "center", justifyContent: "center" },\n  title: { fontSize: 24, marginBottom: 16 },\n});', "jsx", label="JAVASCRIPT  ·  App.js (React Native)")
    b.key("Once you understand **state + components + events** in one framework, the others are easy to pick up. That's why learning one well matters more than which one you pick.")

    # ------------------------------------------------------------------
    b.lesson("Your first mobile app, step by step", label="Lesson 44")
    b.p("We'll use **React Native with Expo**, because it runs on Windows, Mac and Linux and you can test on your **real phone** (iPhone or Android) without installing Xcode or Android Studio.")
    b.h3("Step 1: Install the tools")
    b.steps([
        "Install **Node.js** (the LTS version) from **nodejs.org**. This also installs `npm` and `npx`.",
        "On your phone, install the free **Expo Go** app from the App Store or Google Play.",
    ])
    b.h3("Step 2: Create the project")
    b.code("npx create-expo-app@latest my-first-app --template blank\ncd my-first-app\nnpx expo start", "bash")
    b.p("A **QR code** appears in the terminal. Make sure your phone and computer are on the **same Wi-Fi**. Then:")
    b.bullets([
        "**Android:** open Expo Go and scan the QR code.",
        "**iPhone:** open the Camera app, point it at the QR code and tap the link.",
    ])
    b.p("Your app opens on your phone!")
    b.h3("Step 3: Change it")
    b.p("Open the project folder in VS Code. Replace everything in `App.js` with the React Native counter from Lesson 43 and save. The app on your phone **updates within a second**. This is called **fast refresh**.")
    b.h3("Step 4: Grow it")
    b.p("Turn the counter into something useful, step by step. A great first app is a **to-do list**: a `TextInput` to type tasks, a button to add them, and a `FlatList` to show them. Use `useState` to keep the list. Then save the list on the phone with the `AsyncStorage` package, so tasks survive when the app closes. (Sound familiar? It's Project 2 again, as an app!)")
    b.h3("Going further")
    b.table(
        ["Feature", "What to look up"],
        [
            ["Several screens", "**Expo Router** (navigation between screens)"],
            ["Camera, location, notifications", "`expo-camera`, `expo-location`, `expo-notifications`"],
            ["Save data on the phone", "`AsyncStorage`, or `expo-sqlite` for a real database"],
            ["User accounts and cloud data", "**Firebase** or **Supabase**"],
            ["Build the app for the stores", "**EAS Build** and **EAS Submit** (Expo's build service)"],
        ],
        widths=[2.8, 5.2],
    )
    b.note("**The Flutter path** is very similar: install the Flutter SDK (flutter.dev), run `flutter create my_app`, then `cd my_app` and `flutter run` with a phone or emulator connected, and edit `lib/main.dart`. Flutter's official \"Get started\" guide walks you through installing everything.")

    # ------------------------------------------------------------------
    b.lesson("Desktop apps", label="Lesson 45")
    b.p("Desktop apps run on Windows, macOS or Linux. Many of the apps you use every day, like VS Code, Discord, Slack and Spotify, are built with **web technology** wrapped in a desktop window.")
    b.table(
        ["Tool", "Language", "Good for", "Famous examples"],
        [
            ["**tkinter**", "Python (built in)", "Learning, simple tools", "Small utilities, school projects"],
            ["**PySide6 / PyQt**", "Python", "Professional Python apps", "Scientific and engineering tools"],
            ["**Electron**", "HTML, CSS, JavaScript", "Cross-platform apps using web skills", "VS Code, Discord, Slack"],
            ["**Tauri**", "Web frontend + Rust", "Like Electron but much smaller and lighter", "A growing number of modern apps"],
            ["**WPF / WinUI / .NET MAUI**", "C#", "Windows apps", "Many business and office apps"],
            ["**SwiftUI / AppKit**", "Swift", "Mac apps", "Apple's own Mac apps"],
            ["**Qt**", "C++ (or Python)", "Fast, cross-platform professional apps", "Many design and engineering programs"],
            ["**Flutter**", "Dart", "One codebase for mobile and desktop", "Growing in popularity"],
        ],
        widths=[2.1, 1.8, 2.5, 2.4],
    )
    b.h3("Your first desktop app in Python")
    b.p("You already know enough Python to build a real window with buttons. `tkinter` comes with Python, so there is nothing to install:")
    b.code('import tkinter as tk\n\n\ndef calculate():\n    try:\n        bill = float(bill_entry.get())\n        tip = bill * 0.15\n        result_label.config(text=f"Tip: ${tip:.2f}    Total: ${bill + tip:.2f}")\n    except ValueError:\n        result_label.config(text="Please enter a number.")\n\n\nwindow = tk.Tk()\nwindow.title("Tip Calculator")\nwindow.geometry("320x170")\n\ntk.Label(window, text="Bill amount:").pack(pady=5)\nbill_entry = tk.Entry(window)\nbill_entry.pack()\ntk.Button(window, text="Calculate 15% tip", command=calculate).pack(pady=10)\nresult_label = tk.Label(window, text="")\nresult_label.pack()\n\nwindow.mainloop()', label="PYTHON  ·  tip_app.py")
    b.bullets([
        "`tk.Tk()` creates the window. `Label`, `Entry` (a text box) and `Button` are **widgets**.",
        "`.pack()` places each widget in the window, from top to bottom.",
        "`command=calculate` connects the button to your function. This is **event-driven programming**: your code runs when the user does something.",
        "`window.mainloop()` keeps the window open and waits for events. It's like a `while True` loop that is built in.",
    ])
    b.h3("Turning it into a real program file")
    b.p("Friends without Python can't run a `.py` file. **PyInstaller** packages your program into one file that runs on its own:")
    b.code("python -m pip install pyinstaller\npyinstaller --onefile --windowed tip_app.py", "bash")
    b.p("Your program appears in the `dist` folder (a `.exe` file on Windows). You must build on each system you want to support: on Windows for Windows, on a Mac for Mac.")
    b.note("To share desktop apps widely, developers usually **code-sign** them, so Windows and macOS don't show scary \"unknown developer\" warnings. They then publish on their own website, the **Microsoft Store**, the **Mac App Store**, or Linux app stores like **Flathub**.")

    # ------------------------------------------------------------------
    b.lesson("Web apps and PWAs", label="Lesson 46")
    b.p("A **progressive web app (PWA)** is a website that can be **installed** like an app. It gets its own icon on the home screen, opens full-screen without the browser bar, and can work offline. It's the cheapest way to get an \"app\" on every device, because it's one website, with no app stores and no fees.")
    b.p("To turn a website into a PWA, you add:")
    b.steps([
        "A **web app manifest** (a JSON file describing the app's name, icons and colours)",
        "A **service worker** (a JavaScript file that can cache your files so the app works offline)",
        "**HTTPS** (all the free hosts from Lesson 38 already provide it)",
    ])
    b.code('{\n  "name": "My Tasks",\n  "short_name": "Tasks",\n  "start_url": "/",\n  "display": "standalone",\n  "background_color": "#ffffff",\n  "theme_color": "#2563eb",\n  "icons": [\n    { "src": "icon-192.png", "sizes": "192x192", "type": "image/png" },\n    { "src": "icon-512.png", "sizes": "512x512", "type": "image/png" }\n  ]\n}', "text", label="JSON  ·  manifest.json")
    b.code('<link rel="manifest" href="manifest.json">', "html")
    b.p("Users then install it from the browser: Chrome and Edge show an **Install** button, and on iPhone it's **Share > Add to Home Screen**.")
    b.table(
        ["", "PWA", "Native / cross-platform app"],
        [
            ["**Cost**", "Free", "Store fees, plus usually more development time"],
            ["**Updates**", "Instant: just update the website", "Store review, then users update"],
            ["**Found in app stores?**", "Not by default (Android can list them with extra work)", "Yes"],
            ["**Phone features**", "Many (camera, location, notifications), but fewer on iPhone", "All of them"],
            ["**Best for**", "Tools, dashboards, simple apps, a first version", "Apps that need full phone power or app-store discovery"],
        ],
        widths=[2, 3.1, 3.2],
    )

    # ------------------------------------------------------------------
    b.lesson("How games are made", label="Lesson 47")
    b.p("Games are some of the most fun things to program, and some of the hardest, because they combine code, maths, art, sound and design.")
    b.h3("Game engines")
    b.p("A **game engine** handles the hard parts for you: drawing graphics, physics, sound, input and exporting to different platforms.")
    b.table(
        ["Engine", "Language", "Cost", "Known for"],
        [
            ["**Unity**", "C#", "Free for small creators", "Mobile and indie games; *Hollow Knight*, *Among Us*, *Pokémon GO*"],
            ["**Unreal Engine**", "C++ and Blueprints (visual scripting)", "Free; a share of revenue only for very successful games", "Realistic 3D graphics; *Fortnite*"],
            ["**Godot**", "GDScript (very similar to Python), C#", "Free and open source", "2D and 3D indie games. Great for beginners"],
            ["**Roblox Studio**", "Luau (a version of Lua)", "Free", "Games inside Roblox. Huge young community"],
            ["**GameMaker**", "GML", "Free to start", "2D games; *Undertale*"],
            ["**Pygame**", "Python", "Free", "Learning how games work from scratch"],
        ],
        widths=[1.6, 2.3, 2.3, 3.2],
    )
    b.h3("Every game is a loop")
    b.p("All games, from Pong to Fortnite, run the same **game loop** about 60 times a second:")
    b.steps([
        "**Input:** what keys, buttons or touches did the player press?",
        "**Update:** move things, check for collisions, update the score.",
        "**Draw:** clear the screen and draw everything in its new position.",
    ])
    b.h3("A tiny game in Python with Pygame")
    b.p("Install it with `python -m pip install pygame`, then run this. Use the arrow keys to move the square:")
    b.code('import pygame\n\npygame.init()\nscreen = pygame.display.set_mode((640, 480))\npygame.display.set_caption("Move the square")\nclock = pygame.time.Clock()\nx, y = 300, 220\n\nrunning = True\nwhile running:\n    # 1. input\n    for event in pygame.event.get():\n        if event.type == pygame.QUIT:\n            running = False\n    keys = pygame.key.get_pressed()\n\n    # 2. update\n    if keys[pygame.K_LEFT]:\n        x -= 5\n    if keys[pygame.K_RIGHT]:\n        x += 5\n    if keys[pygame.K_UP]:\n        y -= 5\n    if keys[pygame.K_DOWN]:\n        y += 5\n\n    # 3. draw\n    screen.fill((30, 30, 40))\n    pygame.draw.rect(screen, (0, 200, 255), (x, y, 40, 40))\n    pygame.display.flip()\n    clock.tick(60)          # 60 frames per second\n\npygame.quit()', label="PYTHON  ·  square_game.py")
    b.box("try", "Turn it into a real game:", title="Challenges", items=[
        "Stop the square leaving the screen (keep `x` between 0 and 600, and `y` between 0 and 440).",
        "Add a red \"coin\" at a random position. When the square touches it (`pygame.Rect.colliderect`), add 1 to a score and move the coin.",
        "Show the score on screen with `pygame.font.Font(None, 36).render(...)`.",
        "Add an enemy that chases the player, and a game-over screen.",
    ])
    b.tip("Want to make games seriously? After Pygame, try **Godot** (free, and GDScript feels like Python) and follow its official \"Your first 2D game\" tutorial. Game jams on **itch.io**, where you make a small game in a weekend, are a fantastic way to learn.")

    # ------------------------------------------------------------------
    b.lesson("Everything an app needs", label="Lesson 48")
    b.p("Writing the code is only part of making an app. Here is everything a real app usually needs, from idea to launch:")
    b.table(
        ["Area", "What it means", "Common tools"],
        [
            ["**1. Idea and users**", "Which problem? For whom? Talk to real people who might use it", "Notes, interviews, surveys"],
            ["**2. Design (UI/UX)**", "Sketch every screen and how users move between them, before coding", "Paper, **Figma**"],
            ["**3. Frontend**", "The screens users touch", "React, SwiftUI, Compose, Flutter, React Native"],
            ["**4. Backend**", "Server code for anything shared: accounts, messages, payments", "Python, Node.js, Go... or **Firebase** / **Supabase**"],
            ["**5. Database**", "Stores users and their data", "PostgreSQL, SQLite, Firestore"],
            ["**6. Authentication**", "Sign-up, login, password reset, \"Sign in with Google/Apple\"", "Firebase Auth, Supabase Auth, Auth0, Clerk"],
            ["**7. Hosting**", "Somewhere for the backend and website to run", "Vercel, Render, AWS, Google Cloud"],
            ["**8. Testing**", "Automated tests plus testing on real, different-sized devices", "pytest, Jest, XCTest, beta testers"],
            ["**9. Security and privacy**", "Protect user data; follow privacy laws like GDPR", "Lesson 30's rules"],
            ["**10. Accessibility**", "Usable by people with disabilities: screen readers, contrast, text size", "Platform accessibility checkers"],
            ["**11. Store listing**", "App name, icon, screenshots, description, **privacy policy** (required by the stores)", "App Store Connect, Google Play Console"],
            ["**12. Analytics and crashes**", "See how people use the app and catch crashes", "Firebase Analytics, Sentry"],
            ["**13. Updates and support**", "Fix bugs, answer users, add features", "GitHub Issues, email"],
        ],
        widths=[2, 3.6, 2.8], font_size=8.6,
    )
    b.tip("Start with an **MVP** (minimum viable product): the smallest version that is actually useful. Ship it, get feedback, improve. Most successful apps started very small.")

    # ------------------------------------------------------------------
    b.lesson("Publishing your app", label="Lesson 49")
    b.table(
        ["Where", "Cost", "Requirements", "Review"],
        [
            ["**Apple App Store** (iPhone, iPad, Mac)", "**$99 per year** (Apple Developer Program)", "Usually a Mac with Xcode to build and upload (cloud services like Expo EAS can help); app icons, screenshots and a privacy policy", "Every version is reviewed by Apple. Usually takes a day or two"],
            ["**Google Play** (Android)", "**$25 once**", "A Google Play Console account and identity verification. New personal accounts must first run a closed test with a group of testers (currently at least 12 testers for 14 days)", "Automated plus human review. Usually a few hours to a few days"],
            ["**The web** (website, web app, PWA)", "Free to a few dollars a month", "Hosting, plus an optional domain", "None. You publish instantly"],
            ["**Desktop** (your own website)", "Free (code-signing certificates cost extra)", "An installer or package for each system", "None"],
            ["**Microsoft Store / Mac App Store**", "Low or no registration fee / included in Apple's $99", "Store account and packaged app", "Yes"],
            ["**Games:** itch.io / Steam", "Free / $100 per game on Steam", "Game builds, store page, trailer", "Steam reviews your store page and build"],
        ],
        widths=[2, 1.7, 3.3, 2.2], font_size=8.4,
    )
    b.warn("App store rules and prices change. Before you publish, always read the **current** official pages: Apple's *App Review Guidelines* and Google's *Play Console Help*.")
    b.h3("How apps make money")
    b.bullets([
        "**Paid apps:** users pay once to download.",
        "**In-app purchases and subscriptions:** free to download, with paid extras or a monthly plan. This is the most common model today.",
        "**Ads:** free for users; you are paid by advertisers (for example through Google AdMob).",
        "**Store commission:** Apple and Google keep **15–30%** of digital sales (15% for most small developers).",
    ])

    # ------------------------------------------------------------------
    b.lesson("AI-powered apps", label="Lesson 50")
    b.p("Many new apps include AI features: chat assistants, summarising text, translating, recognising images or generating content. You usually don't build the AI model yourself. Instead, your app **calls an AI model through an API** (Lesson 28), just like it would call a weather API:")
    b.steps([
        "Your app's **backend** sends a request to an AI provider (such as Anthropic's Claude, OpenAI or Google Gemini) with the user's text.",
        "The model sends back its answer, usually as JSON.",
        "Your backend checks it and sends it to your app's screen.",
    ])
    b.warn("Keep AI API keys **on your backend**, never in your website's JavaScript or inside your mobile app, where anyone could find them and spend your money. Also check what your app sends: never send private user data without permission.")
    b.p("To go deeper into AI itself (training your own models), learn Python, NumPy, pandas, statistics and then **scikit-learn** and **PyTorch**. Part 9 shows the full AI/ML path.")
