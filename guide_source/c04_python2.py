"""Part 3: Python Stage 2 - organising data and code."""


def build(b):
    b.part(
        "Part 3",
        "Python, Stage 2: organising data and code",
        "Lists, dictionaries, functions, errors, files and libraries. These are the tools for writing real, useful programs.",
        [
            "How to store many values with lists, tuples, sets and dictionaries",
            "How to write your own functions so code can be reused",
            "Advanced string tricks: slicing, splitting and formatting",
            "How to read error messages and handle errors without crashing",
            "How to save and load data with files",
            "How to use Python's built-in modules and install new packages",
            "How to build a to-do list app that remembers your tasks",
        ],
    )

    # ------------------------------------------------------------------
    b.lesson("Lists: many values in one variable", label="Lesson 9")
    b.p("So far each variable held one value. A **list** holds many values, in order. You write it with square brackets `[ ]` and commas.")
    b.code('fruits = ["apple", "banana", "cherry"]\nprint(fruits)\nprint(fruits[0])        # first item (index 0!)\nprint(len(fruits))      # how many items\n\nfruits.append("mango")  # add to the end\nfruits[1] = "blueberry" # change an item\nprint(fruits)')
    b.out("['apple', 'banana', 'cherry']\napple\n3\n['apple', 'blueberry', 'cherry', 'mango']")
    b.h3("The most useful list operations")
    b.table(
        ["Code", "What it does"],
        [
            ["`items.append(x)`", "Add `x` to the end"],
            ["`items.insert(0, x)`", "Insert `x` at position 0 (the start)"],
            ["`items.remove(x)`", "Remove the first item equal to `x`"],
            ["`items.pop()`", "Remove **and return** the last item (`items.pop(0)` removes the first)"],
            ["`items.sort()`", "Sort the list itself (A to Z or smallest to biggest)"],
            ["`sorted(items)`", "Return a **new** sorted list, leaving the original alone"],
            ["`items.reverse()`", "Reverse the order"],
            ["`x in items`", "`True` if `x` is in the list"],
            ["`items.index(x)`", "The position of `x`"],
            ["`items.count(x)`", "How many times `x` appears"],
            ["`len(items)`, `sum(items)`, `min(items)`, `max(items)`", "Length, total, smallest, biggest"],
        ],
        widths=[3.2, 4.8],
    )
    b.h3("Looping through a list")
    b.code('scores = [72, 88, 95, 61]\ntotal = 0\nfor score in scores:\n    total += score\nprint("Average:", total / len(scores))')
    b.out("Average: 79.0")
    b.p("Python has built-in shortcuts for this kind of thing:")
    b.code('scores = [72, 88, 95, 61]\nprint(sum(scores), max(scores), min(scores))\nprint(sorted(scores))')
    b.out("316 95 61\n[61, 72, 88, 95]")
    b.h3("Slicing: taking part of a list")
    b.p("`items[start:stop]` gives the items from `start` up to, **but not including**, `stop`:")
    b.code('letters = ["a", "b", "c", "d", "e"]\nprint(letters[1:3])   # positions 1 and 2\nprint(letters[:2])    # from the start, stop before 2\nprint(letters[-2:])   # the last two')
    b.out("['b', 'c']\n['a', 'b']\n['d', 'e']")
    b.h3("Getting the position too: enumerate")
    b.code('for number, fruit in enumerate(["apple", "banana", "cherry"], start=1):\n    print(number, fruit)')
    b.out("1 apple\n2 banana\n3 cherry")
    b.h3("Checking if something is in a list")
    b.code('guests = ["Sara", "Omar", "Lina"]\nif "Omar" in guests:\n    print("Omar is invited")')
    b.out("Omar is invited")
    b.tryit([
        "Make a shopping list program: keep asking for items, add each to a list, stop at `done`, then print the list with numbers.",
        "Find the biggest number in `[4, 19, 7, 33, 2]` **without** using `max()`.",
        "Given `scores = [55, 82, 71, 90, 48, 67]`, count how many are 70 or more.",
        "Remove duplicates: from `[1, 2, 2, 3, 1, 4]` make `[1, 2, 3, 4]` with a loop and a new list.",
    ])

    # ------------------------------------------------------------------
    b.lesson("Tuples and sets", label="Lesson 10")
    b.h3("Tuples: lists that cannot change")
    b.p("A **tuple** is like a list, but once created it cannot be changed. Use round brackets. Tuples are great for values that belong together and should stay fixed, like coordinates or a date.")
    b.code('point = (3, 4)\nx, y = point          # "unpacking": take the values out\nprint(x, y)\nprint(point[0])')
    b.out("3 4\n3")
    b.code("point[0] = 10", bad=True)
    b.out("TypeError: 'tuple' object does not support item assignment", label="ERROR")
    b.h3("Sets: no duplicates allowed")
    b.p("A **set** is a collection where every item is **unique**, and there is no fixed order. Use curly brackets.")
    b.code('names = ["sam", "ali", "sam", "mia", "ali"]\nunique = set(names)\nprint(len(unique))\nprint(sorted(unique))')
    b.out("3\n['ali', 'mia', 'sam']")
    b.p("Sets are perfect for comparing groups:")
    b.code("a = {1, 2, 3}\nb = {2, 3, 4}\nprint(a & b)   # in both (intersection)\nprint(a | b)   # in either (union)\nprint(a - b)   # in a but not in b (difference)")
    b.out("{2, 3}\n{1, 2, 3, 4}\n{1}")
    b.h3("Which collection should I use?")
    b.table(
        ["Type", "Looks like", "Ordered?", "Can change?", "Duplicates?", "Use it for"],
        [
            ["**list**", "`[1, 2, 3]`", "Yes", "Yes", "Yes", "Most things: a to-do list, scores"],
            ["**tuple**", "`(1, 2, 3)`", "Yes", "No", "Yes", "Fixed data: coordinates, RGB colours"],
            ["**set**", "`{1, 2, 3}`", "No", "Yes", "No", "Unique items, fast \"is it in here?\" checks"],
            ["**dict**", "`{\"a\": 1}`", "Yes", "Yes", "Keys: no", "Looking things up by name (next lesson!)"],
        ],
        widths=[0.9, 1.4, 1, 1.1, 1.2, 3],
    )

    # ------------------------------------------------------------------
    b.lesson("Dictionaries: looking things up by name", label="Lesson 11")
    b.p("A **dictionary** (`dict`) stores **key: value** pairs. It is like a real dictionary: you look up a word (the key) to find its meaning (the value).")
    b.code('student = {\n    "name": "Sara",\n    "age": 16,\n    "grade": "A",\n}\n\nprint(student["name"])     # look up a value by its key\nstudent["age"] = 17        # change a value\nstudent["city"] = "Cairo"  # add a new pair\nprint(student)')
    b.out("Sara\n{'name': 'Sara', 'age': 17, 'grade': 'A', 'city': 'Cairo'}")
    b.h3("Safe lookups and checking keys")
    b.code('student = {"name": "Sara", "age": 16}\nprint(student.get("phone", "not given"))   # a default if the key is missing\nprint("age" in student)')
    b.out("not given\nTrue")
    b.warn("`student[\"phone\"]` crashes with a `KeyError` if the key doesn't exist. Use `.get()` when you are not sure a key is there.")
    b.h3("Looping through a dictionary")
    b.code('prices = {"apple": 0.5, "bread": 2.25, "milk": 1.2}\nfor item, price in prices.items():\n    print(f"{item}: ${price:.2f}")')
    b.out("apple: $0.50\nbread: $2.25\nmilk: $1.20")
    b.p("`.keys()` gives just the keys, `.values()` gives just the values, and `.items()` gives both as pairs.")
    b.h3("A classic: counting words")
    b.code('text = "the cat and the dog and the bird"\ncounts = {}\nfor word in text.split():\n    counts[word] = counts.get(word, 0) + 1\nprint(counts)')
    b.out("{'the': 3, 'cat': 1, 'and': 2, 'dog': 1, 'bird': 1}")
    b.h3("Lists of dictionaries: real-world data")
    b.p("Most real data looks like this. Think of each dictionary as a row in a spreadsheet:")
    b.code('students = [\n    {"name": "Sara", "score": 91},\n    {"name": "Omar", "score": 78},\n    {"name": "Lina", "score": 85},\n]\n\nfor s in students:\n    print(f"{s[\'name\']} scored {s[\'score\']}")')
    b.out("Sara scored 91\nOmar scored 78\nLina scored 85")
    b.real("Data from websites and apps (called JSON, see Lesson 28) looks almost exactly like Python lists and dictionaries. Learn these well and you will understand most of the data you meet.")
    b.tryit([
        "Make a phone book dict with 3 names and numbers. Ask for a name and print the number, or `Not found`.",
        "Ask the user for a sentence and count how often each word appears.",
        "A shop has `stock = {\"pens\": 10, \"books\": 4}` and `prices = {\"pens\": 1.5, \"books\": 12}`. Print the total value of all stock.",
        "From the `students` list above, print the name of the student with the highest score.",
    ])

    # ------------------------------------------------------------------
    b.lesson("Functions: reusable blocks of code", label="Lesson 12")
    b.p("A **function** is a named block of code that does one job. You **define** it once, then **call** it as many times as you want. You have used functions already: `print()`, `len()`, `input()`. Now you'll make your own.")
    b.code('def greet():\n    print("Hello!")\n    print("Welcome to Python.")\n\ngreet()\ngreet()')
    b.out("Hello!\nWelcome to Python.\nHello!\nWelcome to Python.")
    b.bullets([
        "`def` means **define**. Then the function name, brackets and a colon.",
        "The indented lines are the function's **body**.",
        "Defining a function does **not** run it. Calling it, with `greet()`, does.",
    ])
    b.h3("Parameters: giving a function information")
    b.code('def greet(name):\n    print(f"Hello, {name}!")\n\ngreet("Sara")\ngreet("Omar")')
    b.out("Hello, Sara!\nHello, Omar!")
    b.h3("return: getting an answer back")
    b.code("def add(a, b):\n    return a + b\n\nresult = add(3, 4)\nprint(result)\nprint(add(10, 20) * 2)")
    b.out("7\n60")
    b.key("`print()` **shows** a value on the screen. `return` **gives a value back** to the code that called the function, so you can store it or use it in calculations. Most functions should `return`, not `print`.")
    b.h3("Default values")
    b.code("def power(base, exponent=2):\n    return base ** exponent\n\nprint(power(5))       # uses the default exponent of 2\nprint(power(2, 10))")
    b.out("25\n1024")
    b.h3("Scope: variables live inside their function")
    b.code('def make_message():\n    message = "inside the function"\n    return message\n\nprint(make_message())')
    b.out("inside the function")
    b.p("`message` only exists **inside** `make_message`. If you tried `print(message)` outside the function, you would get a `NameError`. This is called **scope**, and it keeps functions from interfering with each other.")
    b.h3("A complete example: temperature converter")
    b.code('def c_to_f(celsius):\n    """Convert Celsius to Fahrenheit."""\n    return celsius * 9 / 5 + 32\n\n\ndef f_to_c(fahrenheit):\n    """Convert Fahrenheit to Celsius."""\n    return (fahrenheit - 32) * 5 / 9\n\n\nprint(c_to_f(100))\nprint(f_to_c(32))\nprint(round(f_to_c(100), 1))')
    b.out("212.0\n0.0\n37.8")
    b.p("The text in triple quotes right under `def` is a **docstring**. It describes what the function does. Editors show it when you hover over the function.")
    b.h3("Rules for good functions")
    b.bullets([
        "**One function, one job.** If you need the word \"and\" to describe it, split it.",
        "**Name it with a verb:** `calculate_total`, `is_valid_email`, `send_message`.",
        "**Keep it short.** Under about 20 lines is a good target.",
        "**Don't Repeat Yourself (DRY).** If you copy-paste code, it probably belongs in a function.",
    ])
    b.tryit([
        "Write `is_even(n)` that returns `True` or `False`.",
        "Write `rectangle_area(width, height)` and `circle_area(radius)` (use `3.14159`).",
        "Write `count_vowels(text)` that returns how many vowels a string has.",
        "Write `is_prime(n)` that returns `True` if `n` is a prime number. Use it to print all primes below 50.",
    ])

    # ------------------------------------------------------------------
    b.lesson("Strings in depth", label="Lesson 13")
    b.h3("Slicing strings")
    b.code('text = "Hello, World"\nprint(text[0:5])    # characters 0 to 4\nprint(text[7:])     # from 7 to the end\nprint(text[::-1])   # reversed!')
    b.out("Hello\nWorld\ndlroW ,olleH")
    b.h3("The string methods you will use most")
    b.code('sentence = "  learning python is fun  "\nclean = sentence.strip()          # remove spaces at both ends\nprint(clean)\n\nwords = clean.split()             # break into a list of words\nprint(words)\nprint("-".join(words))            # glue a list together\nprint(clean.replace("fun", "awesome"))\nprint(clean.title())')
    b.out("learning python is fun\n['learning', 'python', 'is', 'fun']\nlearning-python-is-fun\nlearning python is awesome\nLearning Python Is Fun")
    b.table(
        ["Method", "What it does", "Example result"],
        [
            ["`s.strip()`", "Remove spaces/new lines from both ends", "`\" hi \"` becomes `\"hi\"`"],
            ["`s.split(\",\")`", "Break into a list at each comma", "`\"a,b\"` becomes `['a', 'b']`"],
            ["`\", \".join(list)`", "Join a list into one string", "`['a', 'b']` becomes `\"a, b\"`"],
            ["`s.replace(a, b)`", "Replace every `a` with `b`", ""],
            ["`s.find(\"x\")`", "Position of `\"x\"` (or `-1` if not found)", ""],
            ["`s.startswith(\"A\")`", "Does it start with `\"A\"`?", "`True` / `False`"],
            ["`s.isdigit()`", "Is it all digits?", "`\"123\"` gives `True`"],
            ["`s.count(\"a\")`", "How many times `\"a\"` appears", ""],
        ],
        widths=[2.2, 3.5, 2.6],
    )
    b.warn("Strings **cannot be changed** in place. `name.upper()` gives you a *new* string. To keep it, store it: `name = name.upper()`.")
    b.h3("Formatting numbers in f-strings")
    b.code('price = 4.5\npopulation = 1234567\nprint(f"Price: ${price:.2f}")        # 2 decimal places\nprint(f"Population: {population:,}")  # thousands separator\nprint(f"[{\'left\':<10}]")              # pad to 10 characters\nprint(f"[{\'right\':>10}]")')
    b.out("Price: $4.50\nPopulation: 1,234,567\n[left      ]\n[     right]")
    b.h3("Example: is it a palindrome?")
    b.code('def is_palindrome(word):\n    word = word.lower()\n    return word == word[::-1]\n\nprint(is_palindrome("Racecar"))\nprint(is_palindrome("Python"))')
    b.out("True\nFalse")
    b.tryit([
        "Ask for a sentence and print how many words it has.",
        "Make an acronym maker: `\"portable network graphics\"` should become `PNG`.",
        "Improve `is_palindrome` so `\"Never odd or even\"` counts as a palindrome (ignore spaces).",
        "Ask for an email address and print the part before the `@` (the username).",
    ])

    # ------------------------------------------------------------------
    b.lesson("Errors and exceptions", label="Lesson 14")
    b.p("There are three kinds of errors:")
    b.table(
        ["Kind", "When", "Example"],
        [
            ["**Syntax error**", "Before the program runs. The code breaks Python's grammar.", "A missing bracket or colon"],
            ["**Runtime error** (exception)", "While the program runs. It crashes.", "Dividing by zero, a missing file"],
            ["**Logic error**", "The program runs, but gives the **wrong answer**. No message at all!", "Using `+` where you meant `-`"],
        ],
        widths=[2, 3.5, 2.5],
    )
    b.h3("How to read an error message (a traceback)")
    b.code('number = 0\nprint(10 / number)', bad=True)
    b.out('Traceback (most recent call last):\n  File "main.py", line 2, in <module>\n    print(10 / number)\n          ~~~^~~~~~~~\nZeroDivisionError: division by zero', label="ERROR")
    b.key("Read tracebacks **from the bottom up**. The **last line** tells you the type of error and what happened. The lines above tell you **where**: the file and the line number.")
    b.h3("The errors you will meet most often")
    b.table(
        ["Error", "What it means", "Usual fix"],
        [
            ["`SyntaxError`", "Python can't understand the code", "Check brackets, quotes and colons"],
            ["`IndentationError`", "Spaces at the start of a line are wrong", "Use 4 spaces consistently"],
            ["`NameError`", "You used a name that doesn't exist", "Check spelling and capitals; define it first"],
            ["`TypeError`", "Wrong type for the operation", "Convert with `int()` or `str()`"],
            ["`ValueError`", "Right type, but a bad value", "e.g. `int(\"hello\")`. Check the input"],
            ["`IndexError`", "List position doesn't exist", "Remember indexes start at 0; check `len()`"],
            ["`KeyError`", "Dictionary key doesn't exist", "Check the key, or use `.get()`"],
            ["`AttributeError`", "That type has no such method", "e.g. calling `.append()` on a string"],
            ["`ZeroDivisionError`", "Divided by zero", "Check before dividing"],
            ["`FileNotFoundError`", "The file isn't there", "Check the file name and folder"],
            ["`ModuleNotFoundError`", "A library isn't installed", "`pip install` it (Lesson 16)"],
        ],
        widths=[2.2, 3, 3],
    )
    b.h3("Handling errors with try and except")
    b.p("Instead of crashing, you can **catch** an error and do something sensible:")
    b.code('try:\n    age = int(input("Age: "))\n    print("In 10 years you will be", age + 10)\nexcept ValueError:\n    print("Please type a number, like 16.")')
    b.out("Age: sixteen\nPlease type a number, like 16.", label="OUTPUT")
    b.p("Python **tries** the code in the `try` block. If a `ValueError` happens, it jumps to the `except` block instead of crashing.")
    b.h3("The pattern: keep asking until the input is valid")
    b.code('while True:\n    try:\n        age = int(input("Age: "))\n        break                     # valid, so leave the loop\n    except ValueError:\n        print("That is not a number. Try again.")\n\nprint("Thanks! You are", age)')
    b.h3("Functions that handle errors")
    b.code("def safe_divide(a, b):\n    try:\n        return a / b\n    except ZeroDivisionError:\n        return None\n\nprint(safe_divide(10, 2))\nprint(safe_divide(5, 0))")
    b.out("5.0\nNone")
    b.p("`None` is Python's special value for \"nothing\" or \"no value\".")
    b.warn("Don't write a bare `except:` that catches **every** error. It also hides real bugs. Always name the error you expect, like `except ValueError:`.")
    b.tryit([
        "Write `get_number(prompt)` that keeps asking until the user types a valid decimal number, then returns it.",
        "Ask for a list position and print `fruits[position]`, catching `IndexError` and `ValueError`.",
        "Find the logic error: `def average(nums): total = 0` / `for n in nums: total = n` / `return total / len(nums)`. Why does `average([2, 4, 6])` give 2.0?",
    ])

    # ------------------------------------------------------------------
    b.lesson("Working with files", label="Lesson 15")
    b.p("Variables disappear when your program ends. To **remember** things, like high scores, notes or settings, save them in a **file**.")
    b.code('# write to a file ("w" = write)\nwith open("notes.txt", "w") as file:\n    file.write("First line\\n")\n    file.write("Second line\\n")\n\n# read it back ("r" = read)\nwith open("notes.txt", "r") as file:\n    content = file.read()\n\nprint(content)')
    b.out("First line\nSecond line")
    b.bullets([
        "`open(name, mode)` opens a file. `with` makes sure it is **closed automatically** afterwards, even if something goes wrong.",
        "`\\n` is the new-line character. `write()` does not add new lines for you.",
        "The file is created in the **same folder** your program runs from.",
    ])
    b.table(
        ["Mode", "Meaning", "Careful!"],
        [
            ["`\"r\"`", "Read (the default)", "Error if the file doesn't exist"],
            ["`\"w\"`", "Write", "**Erases** everything already in the file!"],
            ["`\"a\"`", "Append: add to the end", "Safe: keeps the existing content"],
        ],
        widths=[1, 3, 4],
    )
    b.h3("Reading line by line")
    b.code('with open("notes.txt") as file:\n    for line in file:\n        print(line.strip())    # strip() removes the \\n at the end')
    b.h3("Saving structured data with JSON")
    b.p("For lists and dictionaries, use the built-in `json` module. JSON is the most common format for data on the internet.")
    b.code('import json\n\ndata = {"name": "Sara", "scores": [90, 85]}\n\nwith open("data.json", "w") as file:\n    json.dump(data, file)        # save\n\nwith open("data.json") as file:\n    loaded = json.load(file)     # load\n\nprint(loaded["scores"])')
    b.out("[90, 85]")
    b.note("Other common formats: **CSV** (spreadsheet tables, use the `csv` module), **TXT** (plain text), and databases for big data (Lesson 29).")
    b.tryit([
        "Make a diary: ask for an entry and **append** it to `diary.txt` with today's date (see Lesson 16 for dates, or just type it).",
        "Write a program that counts how many lines are in a text file.",
        "Save a high score to `highscore.txt`. When the program starts, load it, and only overwrite it when the new score is higher.",
    ])

    # ------------------------------------------------------------------
    b.lesson("Modules and libraries", label="Lesson 16")
    b.p("A **module** is a file of Python code that you can **import** to use its functions. Python comes with hundreds of modules built in. This is called the **standard library**, and it's why people say Python comes with \"batteries included\".")
    b.code('import math\n\nprint(math.sqrt(16))\nprint(math.pi)\nprint(math.floor(3.7), math.ceil(3.2))')
    b.out("4.0\n3.141592653589793\n3 4")
    b.h3("Three ways to import")
    b.code('import random                  # use as random.randint(...)\nfrom random import randint     # use as randint(...)\nimport datetime as dt          # a short nickname: dt.date.today()')
    b.code('import random\nfrom datetime import date\n\nprint(random.randint(1, 6))               # a dice roll\nprint(random.choice(["rock", "paper", "scissors"]))\nprint(date.today())                       # today\'s date')
    b.out("4\npaper\n2026-10-06", label="OUTPUT (yours will be different: it's random!)")
    b.h3("Standard library highlights")
    b.table(
        ["Module", "What it is for"],
        [
            ["`math`", "Square roots, pi, rounding up/down, trigonometry"],
            ["`random`", "Random numbers and choices (games, simulations)"],
            ["`datetime`", "Dates and times"],
            ["`time`", "Pausing (`time.sleep(1)`) and measuring time"],
            ["`json`, `csv`", "Reading and writing data files"],
            ["`os`, `pathlib`", "Working with files and folders"],
            ["`statistics`", "Mean, median, mode"],
            ["`sqlite3`", "A real database built into Python (Lesson 29)"],
            ["`turtle`", "Drawing pictures with code. Great fun for beginners!"],
            ["`tkinter`", "Making desktop windows with buttons (Part 7)"],
        ],
        widths=[1.6, 5],
    )
    b.h3("Fun break: drawing with turtle")
    b.code('import turtle\n\npen = turtle.Turtle()\nfor side in range(4):\n    pen.forward(100)   # move 100 steps\n    pen.right(90)      # turn 90 degrees\n\nturtle.done()          # keep the window open')
    b.p("A window opens and draws a square. Change `4` to `5` and `90` to `72` to draw a pentagon. Can you draw a star?")
    b.h3("Installing packages other people made")
    b.p("Beyond the standard library, there are **over 600,000 free packages** on PyPI (the Python Package Index, pypi.org). You install them with **pip** in the terminal:")
    b.code("python -m pip install requests", "bash")
    b.small("On Mac and Linux, use `python3 -m pip install requests`.")
    b.table(
        ["Package", "What it does"],
        [
            ["`requests`", "Download web pages and talk to APIs"],
            ["`pandas`", "Work with tables of data, like a super-powered spreadsheet"],
            ["`numpy`", "Fast maths with large amounts of numbers"],
            ["`matplotlib`", "Draw charts and graphs"],
            ["`flask`, `django`, `fastapi`", "Build websites and web APIs"],
            ["`pygame`", "Make 2D games"],
            ["`pytest`", "Test your code"],
            ["`beautifulsoup4`", "Pull information out of web pages"],
            ["`scikit-learn`, `pytorch`", "Machine learning and AI"],
        ],
        widths=[2.6, 5],
    )
    b.h3("Your own modules")
    b.p("Any `.py` file is a module. If you have `helpers.py` with a function `shout(text)`, another file in the same folder can use it:")
    b.code('# helpers.py\ndef shout(text):\n    return text.upper() + "!"', label="PYTHON  ·  helpers.py")
    b.code('# main.py\nfrom helpers import shout\n\nprint(shout("hello"))', label="PYTHON  ·  main.py", test=False)
    b.out("HELLO!", test=False)
    b.tryit([
        "Make a dice roller: ask how many dice to roll, then print each roll and the total.",
        "Make a random password generator using `random.choice` and the `string` module (`string.ascii_letters`, `string.digits`).",
        "Use `datetime` to print how many days are left until your next birthday.",
        "Use `turtle` to draw a star (hint: 5 sides, turn 144 degrees).",
    ])

    # ------------------------------------------------------------------
    b.lesson("Checkpoint project: to-do list app", label="Project 2", new_page=True)
    b.p("Let's build a real, useful program: a to-do list that **remembers your tasks** even after you close it. It uses functions, lists, loops, `if`, files and error handling: everything from Parts 2 and 3.")
    b.h3("Plan first, code second")
    b.p("Professional developers plan before they code. Our app needs to:")
    b.steps([
        "Load saved tasks from a file when it starts (or start empty)",
        "Show a menu: show tasks, add a task, remove a task, quit",
        "Save the tasks to the file after every change",
        "Never crash, even if the user types something strange",
    ])
    b.p("Each job becomes a **function**. Then `main()` ties them together.")
    b.code(
        'FILENAME = "todo.txt"\n\n\n'
        'def load_tasks():\n'
        '    """Read tasks from the file. Return an empty list if there is no file yet."""\n'
        '    tasks = []\n'
        '    try:\n'
        '        with open(FILENAME) as file:\n'
        '            for line in file:\n'
        '                if line.strip():\n'
        '                    tasks.append(line.strip())\n'
        '    except FileNotFoundError:\n'
        '        pass  # first run: no file yet, that\'s fine\n'
        '    return tasks\n\n\n'
        'def save_tasks(tasks):\n'
        '    with open(FILENAME, "w") as file:\n'
        '        for task in tasks:\n'
        '            file.write(task + "\\n")\n\n\n'
        'def show_tasks(tasks):\n'
        '    if not tasks:\n'
        '        print("No tasks yet!")\n'
        '        return\n'
        '    for number, task in enumerate(tasks, start=1):\n'
        '        print(f"{number}. {task}")\n\n\n'
        'def main():\n'
        '    tasks = load_tasks()\n'
        '    while True:\n'
        '        print("\\n=== TO-DO LIST ===")\n'
        '        print("1) Show  2) Add  3) Remove  4) Quit")\n'
        '        choice = input("Choose 1-4: ").strip()\n\n'
        '        if choice == "1":\n'
        '            show_tasks(tasks)\n'
        '        elif choice == "2":\n'
        '            task = input("New task: ").strip()\n'
        '            if task:\n'
        '                tasks.append(task)\n'
        '                save_tasks(tasks)\n'
        '                print("Added!")\n'
        '        elif choice == "3":\n'
        '            show_tasks(tasks)\n'
        '            try:\n'
        '                number = int(input("Number to remove: "))\n'
        '            except ValueError:\n'
        '                print("Please type a number.")\n'
        '                continue\n'
        '            if 1 <= number <= len(tasks):\n'
        '                removed = tasks.pop(number - 1)\n'
        '                save_tasks(tasks)\n'
        '                print(f"Removed: {removed}")\n'
        '            else:\n'
        '                print("No task with that number.")\n'
        '        elif choice == "4":\n'
        '            print("Goodbye!")\n'
        '            break\n'
        '        else:\n'
        '            print("Please choose 1, 2, 3 or 4.")\n\n\n'
        'main()',
        label="PYTHON  ·  todo.py", keep=False,
    )
    b.out("=== TO-DO LIST ===\n1) Show  2) Add  3) Remove  4) Quit\nChoose 1-4: 2\nNew task: Finish Lesson 16\nAdded!\n\n=== TO-DO LIST ===\n1) Show  2) Add  3) Remove  4) Quit\nChoose 1-4: 1\n1. Finish Lesson 16", label="EXAMPLE RUN")
    b.p("Notice the check `if 1 <= number <= len(tasks)`. Without it, typing `0` would remove the **last** task, because `tasks.pop(-1)` removes the last item. Thinking about strange input like this is called handling **edge cases**, and it's what separates working code from *good* code.")
    b.box("try", "Make it yours:", title="Challenges", items=[
        "Add option **5) Mark as done**, which puts `[x]` in front of a task.",
        "Save tasks as **JSON** with a `done` field: `{\"task\": \"...\", \"done\": false}`.",
        "Add **priorities** (high/medium/low) and show high-priority tasks first.",
        "Add a **due date** to each task and warn about tasks that are overdue.",
    ])
    b.h3("Bonus project: a quiz game")
    b.code(
        'questions = [\n'
        '    {"q": "What does len(\\"hi\\") return?", "a": "2"},\n'
        '    {"q": "Which keyword defines a function?", "a": "def"},\n'
        '    {"q": "What is 2 ** 3?", "a": "8"},\n'
        ']\n\n'
        'score = 0\n'
        'for item in questions:\n'
        '    answer = input(item["q"] + " ").strip().lower()\n'
        '    if answer == item["a"]:\n'
        '        print("Correct!")\n'
        '        score += 1\n'
        '    else:\n'
        '        print(f"Wrong, the answer is {item[\'a\']}")\n\n'
        'print(f"You scored {score}/{len(questions)}")',
        label="PYTHON  ·  quiz.py",
    )

    # ------------------------------------------------------------------
    b.lesson("Quiz 2 and Stage 2 checklist", label="Checkpoint")
    b.steps([
        "What does `[10, 20, 30][1]` give?",
        "What is the difference between `items.sort()` and `sorted(items)`?",
        "Which collection automatically removes duplicates?",
        "How do you safely get a dictionary value that might be missing?",
        "What is the difference between `print` and `return` in a function?",
        "What does `\"a,b,c\".split(\",\")` return?",
        "What does `\"Python\"[::-1]` give?",
        "Which file mode erases a file's content: `\"r\"`, `\"w\"` or `\"a\"`?",
        "In which order should you read a traceback?",
        "What command installs the package `requests`?",
    ])
    b.h3("Can you do these on your own?")
    b.bullets([
        "Create, change, loop over and slice lists",
        "Choose between a list, tuple, set and dictionary",
        "Store and look up data in dictionaries, including lists of dictionaries",
        "Write functions with parameters and `return` values",
        "Use string methods: `split`, `join`, `strip`, `replace`",
        "Read a traceback and fix the error",
        "Catch errors with `try` / `except`",
        "Read and write text and JSON files",
        "Import modules and install packages with pip",
        "Build the to-do app with at least one challenge feature",
    ], check=True)
