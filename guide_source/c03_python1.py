"""Part 2: Python Stage 1 - the basics."""


def build(b):
    b.part(
        "Part 2",
        "Python, Stage 1: the basics",
        "Your first real programs. Printing, variables, maths, input, text, decisions and loops, then your first game.",
        [
            "How to show things on the screen with `print()`",
            "How to store information in variables",
            "Numbers, text and true/false values, plus doing maths",
            "How to ask the user for input",
            "How to make decisions with `if`, `elif` and `else`",
            "How to repeat things with `while` and `for` loops",
            "How to build a complete number-guessing game",
        ],
    )

    # ------------------------------------------------------------------
    b.lesson("Your first program", label="Lesson 1")
    b.p("Open your editor and type this program. Do not copy and paste it. Typing it is part of learning.")
    b.code('print("Hello, world!")\nprint("I am learning Python.")\nprint(5 + 3)')
    b.out("Hello, world!\nI am learning Python.\n8")
    b.p("Let's look at what happened:")
    b.bullets([
        "`print()` is a **function**: a command that does a job. Its job is to show things on the screen.",
        "Whatever you put **inside the brackets** is what gets printed.",
        "Text must be inside **quotes**. Text in quotes is called a **string**.",
        "Numbers do not need quotes. `5 + 3` is calculated first, then the answer `8` is printed.",
        "The program runs **from top to bottom**, one line at a time.",
    ])
    b.h3("Comments: notes for humans")
    b.p("Anything after a `#` symbol is a **comment**. Python ignores it completely. Comments explain your code to people, including future you.")
    b.code(
        '# This whole line is a comment. Python skips it.\n'
        'print("Comments help humans understand code")  # a comment at the end of a line'
    )
    b.out("Comments help humans understand code")
    b.h3("Your first error (on purpose!)")
    b.p("Let's break something, so the first error you see doesn't scare you. Remove the closing bracket:")
    b.code('print("Hello"', bad=True)
    b.out(
        '  File "hello.py", line 1\n'
        '    print("Hello"\n'
        '         ^\n'
        "SyntaxError: '(' was never closed",
        label="ERROR",
    )
    b.p(
        "Python tells you **the file**, **the line number**, points with `^` to where it got "
        "confused, and gives the **type of error**. A `SyntaxError` means you broke the grammar "
        "rules, like a missing bracket or quote."
    )
    b.p("Now try a capital letter:")
    b.code('Print("Hello")', bad=True)
    b.out("NameError: name 'Print' is not defined. Did you mean: 'print'?", label="ERROR")
    b.warn("Python is **case-sensitive**. `print`, `Print` and `PRINT` are three different words to Python. Only `print` exists.")
    b.tryit([
        "Print your name, your age and your city on three separate lines.",
        "Print the result of `12 * 7`. (In Python, `*` means multiply.)",
        "Delete one quote mark from a `print` line and read the error message. Then fix it.",
        "Print this box using three `print` lines:\n`*****`   then   `*   *`   then   `*****`",
    ])

    # ------------------------------------------------------------------
    b.lesson("Variables: storing information", label="Lesson 2")
    b.p(
        "A **variable** is a name that stores a value, like a labelled box. You create one with "
        "the `=` sign. Then you can use the name instead of the value."
    )
    b.code(
        'name = "Amira"\nage = 16\nprint(name)\nprint(age)\n\n'
        'age = 17          # put a new value in the box\nprint(age)'
    )
    b.out("Amira\n16\n17")
    b.key(
        "In Python, `=` does **not** mean \"equals\" like in maths. It means **\"store the value "
        "on the right in the name on the left\"**. Read `age = 17` as \"age becomes 17\"."
    )
    b.h3("Rules for naming variables")
    b.table(
        ["Name", "Allowed?", "Why"],
        [
            ["`user_name`", "{sym:✓} Yes, and good", "Clear, lowercase, words joined with `_`"],
            ["`score2`", "{sym:✓} Yes", "Numbers are fine, just not at the start"],
            ["`2score`", "{sym:✗} No", "Cannot start with a number"],
            ["`user name`", "{sym:✗} No", "No spaces allowed"],
            ["`for`", "{sym:✗} No", "`for` is a Python keyword (a reserved word)"],
            ["`x`", "Allowed, but unclear", "Fine for maths. Elsewhere, use names that explain what they hold"],
            ["`Age` vs `age`", "Both allowed", "But they are **two different** variables!"],
        ],
        widths=[1.6, 1.8, 4.5],
    )
    b.tip("Python programmers write variable names in **snake_case**: all lowercase, with words joined by underscores, like `high_score` or `first_name`.")
    b.h3("Using variables together")
    b.code('first = "Ada"\nlast = "Lovelace"\nfull = first + " " + last\nprint(full)')
    b.out("Ada Lovelace")
    b.p("Using `+` on strings joins them together. This is called **concatenation**. Notice the `\" \"`: a string with just a space, so the names don't stick together.")
    b.h3("Updating a variable")
    b.code('score = 0\nscore = score + 10   # take the old value, add 10, store it back\nscore += 5           # a shortcut for: score = score + 5\nprint(score)')
    b.out("15")
    b.p("The shortcuts `+=`, `-=`, `*=` and `/=` are used all the time. For example, `lives -= 1` means \"lose one life\".")
    b.note("Ada Lovelace wrote what many people call the first computer program, back in the 1840s, "
           "for a machine that was never fully built. The Ada programming language is named after her.")
    b.tryit([
        "Make variables `city` and `country` and print a sentence like `I live in Cairo, Egypt`.",
        "Make variables `price = 4` and `quantity = 3`. Print the total cost.",
        "Start with `coins = 50`. Spend 20 coins, then find 35 more, using `-=` and `+=`. Print `coins` (should be 65).",
        "Swap the values of `a = 1` and `b = 2` so `a` is 2 and `b` is 1. Hint: use a third variable.",
    ])

    # ------------------------------------------------------------------
    b.lesson("Data types and maths", label="Lesson 3")
    b.p("Every value in Python has a **type**. The four basic types are:")
    b.table(
        ["Type", "Name", "Examples", "Used for"],
        [
            ["`int`", "integer", "`42`, `-7`, `0`", "Whole numbers: ages, counts, scores"],
            ["`float`", "floating-point number", "`3.14`, `-0.5`, `2.0`", "Decimal numbers: prices, measurements"],
            ["`str`", "string", "`\"hello\"`, `'42'`, `\"\"`", "Text of any kind"],
            ["`bool`", "boolean", "`True`, `False`", "Yes/no answers (note the capital letter)"],
        ],
        widths=[0.9, 1.9, 2.1, 3.2],
    )
    b.p("You can ask Python for the type of any value with `type()`:")
    b.code('print(type(42))\nprint(type(3.14))\nprint(type("hello"))\nprint(type(True))')
    b.out("<class 'int'>\n<class 'float'>\n<class 'str'>\n<class 'bool'>")
    b.h3("Maths operators")
    b.code(
        "print(10 + 3)    # add\nprint(10 - 3)    # subtract\nprint(10 * 3)    # multiply\n"
        "print(10 / 3)    # divide (always gives a float)\nprint(10 // 3)   # floor division: divide and drop the decimals\n"
        "print(10 % 3)    # modulo: the remainder after dividing\nprint(10 ** 3)   # power: 10 to the power of 3"
    )
    b.out("13\n7\n30\n3.3333333333333335\n3\n1\n1000")
    b.note("Why `3.3333333333333335` and not `...333`? Computers store decimals in binary, so tiny "
           "rounding differences happen. Use `round(10 / 3, 2)` to get `3.33`.")
    b.h3("The amazing `%` (modulo)")
    b.p("Modulo gives the **remainder**. It sounds boring, but it is everywhere in programming:")
    b.bullets([
        "`n % 2 == 0` checks if a number is **even** (no remainder when divided by 2).",
        "`total_minutes % 60` gives the minutes left over after taking out full hours.",
        "Games use it to wrap around, like going from the last level back to the first.",
    ])
    b.h3("Order of operations")
    b.p("Python follows the same order as maths: brackets first, then powers, then `* / // %`, then `+ -`.")
    b.code("print(2 + 3 * 4)\nprint((2 + 3) * 4)")
    b.out("14\n20")
    b.h3("Numbers and strings are different!")
    b.code('print("5" + "5")   # two strings: joined together\nprint(5 + 5)       # two numbers: added')
    b.out("55\n10")
    b.code('print("5" + 5)', bad=True)
    b.out('TypeError: can only concatenate str (not "int") to str', label="ERROR")
    b.p("Python refuses to add text to a number because it cannot know what you want. You will learn to convert between types in the next lesson.")
    b.tryit([
        "Calculate how many seconds there are in one day (60 seconds × 60 minutes × 24 hours).",
        "Convert 100 °C to Fahrenheit with the formula `c * 9 / 5 + 32`.",
        "Use `//` and `%` to turn 135 minutes into hours and minutes (should be 2 hours and 15 minutes).",
        "Predict the output of `print(2 ** 10)` and `print(17 % 5)`, then check.",
    ])

    # ------------------------------------------------------------------
    b.lesson("Talking to the user: input", label="Lesson 4")
    b.p("Programs get interesting when they react to the user. `input()` shows a message, waits for the user to type something and press Enter, then gives you what they typed.")
    b.code('name = input("What is your name? ")\nprint("Nice to meet you, " + name + "!")')
    b.out("What is your name? Sara\nNice to meet you, Sara!", label="OUTPUT (the user typed Sara)")
    b.key("`input()` **always** gives you a **string**, even if the user types a number. To do maths with it, you must convert it first.")
    b.h3("Converting between types")
    b.table(
        ["Function", "Converts to", "Example", "Result"],
        [
            ["`int()`", "whole number", "`int(\"16\")`", "`16`"],
            ["`float()`", "decimal number", "`float(\"4.5\")`", "`4.5`"],
            ["`str()`", "string", "`str(99)`", "`\"99\"`"],
            ["`int()`", "whole number (cuts off the decimals)", "`int(3.9)`", "`3`"],
        ],
        widths=[1.2, 2.6, 1.8, 1.2],
    )
    b.code('age = input("How old are you? ")\nage = int(age)                       # "16" becomes 16\nprint("Next year you will be", age + 1)')
    b.out("How old are you? 16\nNext year you will be 17", label="OUTPUT")
    b.tip("`print()` can take several values separated by commas. It puts a space between them "
          "automatically and can mix text and numbers, so `print(\"Age:\", 16)` works without converting.")
    b.p("A shorter way, which you will see everywhere:")
    b.code('age = int(input("How old are you? "))')
    b.h3("Mini program: a tip calculator")
    b.code(
        'bill = float(input("Bill amount: "))\n'
        'tip_percent = float(input("Tip percent: "))\n\n'
        'tip = bill * tip_percent / 100\n'
        'total = bill + tip\n\n'
        'print("Tip:", round(tip, 2))\n'
        'print("Total:", round(total, 2))'
    )
    b.out("Bill amount: 40\nTip percent: 15\nTip: 6.0\nTotal: 46.0", label="OUTPUT")
    b.warn("If the user types `hello` when you call `int()`, the program crashes with a `ValueError`. That's normal for now. In Lesson 14 you will learn how to handle bad input politely.")
    b.tryit([
        "Ask the user for two numbers. Print their sum, difference, product and division.",
        "Ask for the year someone was born and print how old they turn this year (use 2026).",
        "Ask for a number of minutes and print it as hours and minutes (use `//` and `%`).",
        "Ask for the user's name and favourite food, then print a funny sentence using both.",
    ])

    # ------------------------------------------------------------------
    b.lesson("Working with text (strings)", label="Lesson 5")
    b.p("You will work with text constantly: names, messages, passwords, web pages. Python has great tools for it.")
    b.h3("f-strings: the best way to mix text and values")
    b.p("Put an `f` before the opening quote. Then anything inside `{curly brackets}` is replaced by its value:")
    b.code('name = "Leo"\nage = 15\nprint(f"{name} is {age} years old.")\nprint(f"Next year {name} will be {age + 1}.")')
    b.out("Leo is 15 years old.\nNext year Leo will be 16.")
    b.tip("f-strings are cleaner than joining with `+`, and you don't need to convert numbers with `str()`. Use them by default.")
    b.h3("Useful string tools")
    b.code('word = "Python"\nprint(len(word))      # length: how many characters\nprint(word.upper())   # UPPERCASE\nprint(word.lower())   # lowercase\nprint(word[0])        # the first character\nprint(word[-1])       # the last character')
    b.out("6\nPYTHON\npython\nP\nn")
    b.h3("Counting starts at zero")
    b.p("Each character has a position number called an **index**. In programming, counting starts at **0**, not 1. Negative numbers count from the end:")
    b.table(
        ["Character", "P", "y", "t", "h", "o", "n"],
        [
            ["**Index**", "0", "1", "2", "3", "4", "5"],
            ["**Negative index**", "-6", "-5", "-4", "-3", "-2", "-1"],
        ],
        widths=[2.2, 1, 1, 1, 1, 1, 1],
    )
    b.warn("Asking for an index that doesn't exist, like `word[10]`, causes an `IndexError: string index out of range`.")
    b.h3("Special characters")
    b.code('print("Line one\\nLine two")     # \\n means new line\nprint("Name:\\tSara")            # \\t means tab\nprint("It\'s easy")               # an apostrophe inside double quotes is fine\nprint("=" * 20)                 # repeat a string')
    b.out("Line one\nLine two\nName:\tSara\nIt's easy\n====================")
    b.tryit([
        "Ask for the user's name. Print it in UPPERCASE, and how many letters it has.",
        "Print the first and the last letter of any word the user types.",
        "Print a banner: a line of 30 `=` signs, a title, then another line of 30 `=` signs.",
        "Use an f-string to print: `Sara scored 91 points out of 100 (91%)` using variables.",
    ])

    # ------------------------------------------------------------------
    b.lesson("Making decisions: if, elif, else", label="Lesson 6")
    b.p("Programs need to make choices: *if* the password is right, let them in; *otherwise*, show an error. First we need a way to compare things.")
    b.h3("Comparison operators")
    b.table(
        ["Operator", "Meaning", "Example", "Result"],
        [
            ["`==`", "is equal to", "`5 == 5`", "`True`"],
            ["`!=`", "is not equal to", "`5 != 3`", "`True`"],
            ["`>`", "is greater than", "`5 > 8`", "`False`"],
            ["`<`", "is less than", "`5 < 8`", "`True`"],
            ["`>=`", "is greater than or equal to", "`5 >= 5`", "`True`"],
            ["`<=`", "is less than or equal to", "`4 <= 3`", "`False`"],
        ],
        widths=[1.1, 3, 1.6, 1.3],
    )
    b.warn("`=` **stores** a value. `==` **compares** two values. Mixing them up is one of the most common beginner mistakes.")
    b.h3("if and else")
    b.code('age = 16\n\nif age >= 18:\n    print("You can vote.")\nelse:\n    print("You cannot vote yet.")\n\nprint("Done.")')
    b.out("You cannot vote yet.\nDone.")
    b.p("Three important details:")
    b.bullets([
        "The `if` line ends with a **colon** `:`.",
        "The lines that belong to the `if` are **indented** (pushed right) by **4 spaces**. Indentation is how Python knows which lines are inside the `if`.",
        "`print(\"Done.\")` is not indented, so it runs no matter what.",
    ])
    b.h3("elif: more than two choices")
    b.code('score = 85\n\nif score >= 90:\n    grade = "A"\nelif score >= 80:\n    grade = "B"\nelif score >= 70:\n    grade = "C"\nelse:\n    grade = "F"\n\nprint(f"Your grade is {grade}")')
    b.out("Your grade is B")
    b.p("Python checks each condition **from top to bottom** and runs **only the first one that is true**. 85 is not ≥ 90, but it is ≥ 80, so the grade is B, and Python skips the rest.")
    b.h3("Combining conditions: and, or, not")
    b.table(
        ["Operator", "True when...", "Example"],
        [
            ["`and`", "**both** sides are true", "`age >= 13 and age <= 19` (a teenager)"],
            ["`or`", "**at least one** side is true", "`day == \"Sat\" or day == \"Sun\"` (the weekend)"],
            ["`not`", "the condition is false", "`not is_raining`"],
        ],
        widths=[1.2, 2.6, 4],
    )
    b.code('age = 20\nhas_ticket = True\n\nif age >= 18 and has_ticket:\n    print("Welcome to the concert!")\nelif not has_ticket:\n    print("You need a ticket.")\nelse:\n    print("Sorry, adults only.")')
    b.out("Welcome to the concert!")
    b.h3("Even or odd?")
    b.code('number = 7\nif number % 2 == 0:\n    print(f"{number} is even")\nelse:\n    print(f"{number} is odd")')
    b.out("7 is odd")
    b.tryit([
        "Ask for a number and say whether it is positive, negative or zero.",
        "Ask for a password. If it is `\"open123\"` print `Access granted`, otherwise `Access denied`.",
        "Ask for three numbers and print the biggest one (don't use `max()`, use `if`).",
        "Leap year: a year is a leap year if it is divisible by 4, **except** years divisible by 100 that are **not** divisible by 400. Check 2024, 1900 and 2000.",
    ])

    # ------------------------------------------------------------------
    b.lesson("Repeating things: while loops", label="Lesson 7")
    b.p("A **loop** repeats code. A `while` loop repeats **as long as a condition is true**.")
    b.code('count = 1\nwhile count <= 5:\n    print(count)\n    count += 1\nprint("Finished!")')
    b.out("1\n2\n3\n4\n5\nFinished!")
    b.p("Step by step: `count` starts at 1. Is `1 <= 5`? Yes, so print 1 and add 1. Is `2 <= 5`? Yes... When `count` becomes 6, the condition is false and the loop stops.")
    b.warn("If you forget `count += 1`, `count` stays 1 forever and the loop **never ends**. This is an **infinite loop**. Press **Ctrl + C** in the terminal (or the Stop button) to stop it.")
    b.h3("Countdown")
    b.code('n = 3\nwhile n > 0:\n    print(n)\n    n -= 1\nprint("Liftoff!")')
    b.out("3\n2\n1\nLiftoff!")
    b.h3("Repeat until the user gets it right")
    b.code('password = ""\nwhile password != "python123":\n    password = input("Enter password: ")\nprint("Access granted")')
    b.out("Enter password: hello\nEnter password: python\nEnter password: python123\nAccess granted", label="OUTPUT")
    b.h3("Adding up numbers")
    b.code('total = 0\nnumber = 1\nwhile number <= 100:\n    total += number\n    number += 1\nprint(total)')
    b.out("5050")
    b.tryit([
        "Print all even numbers from 2 to 20 with a `while` loop.",
        "Keep asking the user for numbers until they type `0`. Then print the total of all numbers typed.",
        "Print the 7 times table up to 7 × 10.",
        "A bank account starts at 1000 and grows 5% every year. How many years until it is over 2000?",
    ])

    # ------------------------------------------------------------------
    b.lesson("for loops and range", label="Lesson 8")
    b.p("A `for` loop goes through a sequence of items **one at a time**. Combined with `range()`, it is the easiest way to repeat something a set number of times.")
    b.code("for i in range(5):\n    print(i)")
    b.out("0\n1\n2\n3\n4")
    b.p("`range(5)` gives the numbers 0, 1, 2, 3, 4. That's five numbers, starting at 0 and **stopping before 5**.")
    b.table(
        ["Code", "Numbers you get", "Meaning"],
        [
            ["`range(5)`", "0 1 2 3 4", "from 0, stop before 5"],
            ["`range(1, 6)`", "1 2 3 4 5", "from 1, stop before 6"],
            ["`range(0, 11, 2)`", "0 2 4 6 8 10", "from 0, stop before 11, step 2"],
            ["`range(10, 0, -1)`", "10 9 8 7 6 5 4 3 2 1", "count down, step -1"],
        ],
        widths=[2.2, 2.6, 2.6],
    )
    b.h3("Looping through a string")
    b.code('for letter in "cat":\n    print(letter)')
    b.out("c\na\nt")
    b.h3("A times table")
    b.code('number = 7\nfor i in range(1, 11):\n    print(f"{number} x {i} = {number * i}")')
    b.out("7 x 1 = 7\n7 x 2 = 14\n7 x 3 = 21\n7 x 4 = 28\n7 x 5 = 35\n7 x 6 = 42\n7 x 7 = 49\n7 x 8 = 56\n7 x 9 = 63\n7 x 10 = 70")
    b.h3("break and continue")
    b.p("`break` **stops** the loop immediately. `continue` **skips** to the next round.")
    b.code("for i in range(1, 10):\n    if i == 5:\n        break\n    print(i)")
    b.out("1\n2\n3\n4")
    b.code("for i in range(1, 6):\n    if i == 3:\n        continue\n    print(i)")
    b.out("1\n2\n4\n5")
    b.h3("Loops inside loops")
    b.code('for row in range(1, 5):\n    print("*" * row)')
    b.out("*\n**\n***\n****")
    b.code('for row in range(1, 4):\n    for col in range(1, 4):\n        print(row * col, end=" ")\n    print()')
    b.out("1 2 3 \n2 4 6 \n3 6 9")
    b.p("`end=\" \"` tells `print` to end with a space instead of a new line, and an empty `print()` moves to the next line.")
    b.key("Use a **`for` loop** when you know how many times to repeat, or want to go through items. "
          "Use a **`while` loop** when you repeat *until something happens*, like a correct answer.")
    b.tryit([
        "Print the numbers from 10 down to 1, then `Happy New Year!`",
        "Ask for a word and count how many vowels (a, e, i, o, u) it has.",
        "**FizzBuzz** (a famous interview question): print 1 to 30, but print `Fizz` for multiples of 3, `Buzz` for multiples of 5, and `FizzBuzz` for multiples of both.",
        "Ask for a number `n` and print a right-angled triangle of `#` that is `n` rows tall.",
    ])

    # ------------------------------------------------------------------
    b.lesson("Checkpoint project: number-guessing game", label="Project 1", new_page=True)
    b.p("Time to combine everything into a real game. The computer picks a secret number and the player guesses until they find it. We will build it in **three versions**, adding a little each time, just like real developers do.")
    b.h3("Version 1: one guess")
    b.code('secret = 7\nguess = int(input("Guess my number (1-10): "))\n\nif guess == secret:\n    print("Correct!")\nelse:\n    print("Wrong! It was", secret)')
    b.h3("Version 2: keep guessing until correct")
    b.code('secret = 7\nguess = 0\n\nwhile guess != secret:\n    guess = int(input("Guess my number (1-10): "))\n    if guess != secret:\n        print("Nope, try again.")\n\nprint("Correct!")')
    b.h3("Version 3: random number, hints and score")
    b.p("Python has a built-in **module** called `random` (more about modules in Lesson 16). `random.randint(1, 100)` picks a random whole number from 1 to 100.")
    b.code(
        'import random\n\n'
        'secret = random.randint(1, 100)\n'
        'attempts = 0\n\n'
        'print("I\'m thinking of a number between 1 and 100.")\n\n'
        'while True:\n'
        '    guess = int(input("Your guess: "))\n'
        '    attempts += 1\n\n'
        '    if guess < secret:\n'
        '        print("Too low!")\n'
        '    elif guess > secret:\n'
        '        print("Too high!")\n'
        '    else:\n'
        '        print(f"Correct! You got it in {attempts} attempts.")\n'
        '        break',
        label="PYTHON  ·  guessing_game.py",
    )
    b.out("I'm thinking of a number between 1 and 100.\nYour guess: 50\nToo high!\nYour guess: 25\nToo low!\nYour guess: 37\nToo high!\nYour guess: 31\nCorrect! You got it in 4 attempts.", label="EXAMPLE GAME")
    b.p("`while True:` loops forever **on purpose**. We leave the loop with `break` when the guess is correct. This is a very common pattern.")
    b.tip("Smart strategy: always guess the middle of what's left (50, then 25 or 75, and so on). You will never need more than 7 guesses for 1 to 100. This idea is called **binary search**, and you will meet it again in Lesson 23.")
    b.box("try", "Upgrade your game. Each one is a real feature request:", title="Challenges",
          items=[
              "Give the player only **7 attempts**. If they run out, show the secret number.",
              "After winning, ask **\"Play again? (y/n)\"** and restart if they type `y`.",
              "Add **difficulty levels**: easy (1–10), medium (1–100), hard (1–1000).",
              "Keep track of the **best score** (fewest attempts) across games.",
          ])

    # ------------------------------------------------------------------
    b.lesson("Quiz 1 and Stage 1 checklist", label="Checkpoint")
    b.p("Answer without running code first. Then check with Python, and with the answers in Appendix A. **Aim for 8 out of 10** before moving on.")
    b.steps([
        "What does `print(7 // 2)` show?",
        "What is the type of `\"42\"`?",
        "What is wrong with `if x = 5:`?",
        "What does `for i in range(2, 8, 2): print(i)` print?",
        "What type of value does `input()` always return?",
        "What is `x` after: `x = 10`, then `x += 5`, then `x *= 2`?",
        "What is the difference between `=` and `==`?",
        "What does `\"ab\" * 3` give?",
        "How do you stop a program stuck in an infinite loop?",
        "What does `print(len(\"hello world\"))` show?",
    ])
    b.h3("Can you do these on your own?")
    b.bullets([
        "Write and run a `.py` file",
        "Create variables and update them with `+=`",
        "Use `int`, `float`, `str` and `bool`, and convert between them",
        "Ask the user for input and use it in a calculation",
        "Use f-strings to build messages",
        "Write `if` / `elif` / `else` with `and` / `or`",
        "Write `while` and `for` loops, and use `break`",
        "Build the guessing game without looking at the code",
    ], check=True)
