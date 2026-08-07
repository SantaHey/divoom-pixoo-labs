# Liens

Divoom beginner : https://divoom.com/blogs/app-guide/pixoo-64-api-beginner-guide
    - Local HTTP API
    - Community Tools
Pixoo REST : https://github.com/4ch1m/pixoo-rest
Divoom .NET : https://github.com/panoramicdata/Divoom.Api
Timebox : https://doc.divoom-gz.com/web/#/12?page_id=486
Pixoo-MCP : https://github.com/cyanheads/pixoo-mcp-server

-- PYTHON
Pixoo Python (lib d'origine) : https://github.com/SomethingWithComputers/pixoo
Pixoo-ng (fork maintenu) : https://github.com/kongo09/pixoo-ng
Pixoo-next (support Pixoo 16 / Times Gate) : https://github.com/TheSecondLugia/pixoo-next

-- Pixoo Client
https://github.com/virtualabs/pixoo-client

# 1-pixoo-next

https://github.com/TheSecondLugia/pixoo-next

```sh
uv venv --python 3.11 C:\Users\jeannico.thurre\labs\_kernel-uv
```

```sh
cd C:\Users\jeannico.thurre\labs\divoom\1-pixoo-next
git clone https://github.com/TheSecondLugia/pixoo-next _pixoo-next
cd _pixoo-next
C:\Users\jeannico.thurre\labs\_kernel-uv\Scripts\activate.ps1
uv pip install -e .
```

```sh
# run example
uv run --active .\examples\pixoorest\main.py
```

# 2-pixoo-client

```sh
cd C:\Users\jeannico.thurre\labs\divoom\2-pixoo-client
git clone https://github.com/virtualabs/pixoo-client _pixoo-client
C:\Users\jeannico.thurre\labs\_kernel-uv\Scripts\activate.ps1
cd .\_pixoo-client\
uv pip install -r requirements.txt
```

```sh
cd C:\Users\jeannico.thurre\labs\divoom\2-pixoo-client
cd .\_pixoo-client\

C:\Users\jeannico.thurre\labs\_kernel-uv\Scripts\activate.ps1

uv run pixoo.py 11:75:58:C1:62:D0 frame.png
```

# 3-RubixDev

# 3-RubixDev

```sh
mkdir C:\Users\jeannico.thurre\labs\divoom\3-RubixDev
cd C:\Users\jeannico.thurre\labs\divoom\3-RubixDev
git clone https://github.com/RubixDev/pixoo _pixoo
cd _pixoo
```

```sh
# install rust (Windows)
winget install -e --id Rustlang.Rustup
```

```sh
# run example
cargo run --release --example=image 11:75:58:C1:62:D0
```
 
# 4-pixoo-soup

install pré-requis
```sh
# install nodejs (Windows)
winget install -e --id OpenJS.NodeJS
```

```sh
cd C:\Users\jeannico.thurre\labs\divoom
git clone https://github.com/saintedlama/pixoo-soup 4-pixoo-soup
cd 4-pixoo-soup
npm install
```

```sh
cd C:\Users\jeannico.thurre\labs\divoom\4-pixoo-soup
node demo.js 11:75:58:C1:62:D0
```
