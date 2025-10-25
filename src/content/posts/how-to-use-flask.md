---
title: '如何使用Python Flask模块'
author: 'freebird2913'
published: 2025-09-07T04:10:28.635Z
description: 'Python Flask框架完整入门教程：从零开始学习Flask Web开发，详细讲解框架安装配置、第一个应用创建、路由系统设计、动态URL参数、HTTP方法处理、Jinja2模板渲染、静态文件管理、表单处理等核心功能，配合实战代码示例，帮助Python开发者快速上手轻量级Web应用开发。'
image: ''
tags: ['Python', 'Flask', 'Web开发', 'Web框架', 'Jinja2']
category: 'Web开发'
draft: false
lang: 'zh-CN'
excerpt: '本文将带你从零开始学习Python Flask框架，包括安装、第一个应用、路由、模板渲染和静态文件，助你快速入门Web开发。'
keywords: ['Python', 'Flask', 'Web框架', 'Flask入门', 'Web应用']
readingTime: 15
series: 'Web开发入门'
seriesOrder: 1
---

## 1. Flask简介

Flask是一个轻量级的Python Web框架，它不包含ORM、表单验证等工具，而是让开发者自行选择。这使得Flask非常灵活，适合快速开发小型应用和API。

## 2. 安装Flask

使用pip安装Flask非常简单：

```bash
pip install Flask
```

## 3. 第一个Flask应用

创建一个名为 [`app.py`](app.py) 的文件，并添加以下代码：

```python
from flask import Flask

app = Flask(__name__)

@app.route('/')
def hello_world():
    return 'Hello, World!'

if __name__ == '__main_':
    app.run(debug=True)
```

运行应用：

```bash
python app.py
```

在浏览器中访问 `http://127.0.0.1:5000/`，你将看到 "Hello, World!"。

## 4. 路由和视图函数

### 4.1. 动态路由

你可以在URL中使用变量：

```python
@app.route('/user/<username>')
def show_user_profile(username):
    return f'User {username}'

@app.route('/post/<int:post_id>')
def show_post(post_id):
    return f'Post {post_id}'
```

### 4.2. HTTP方法

指定路由支持的HTTP方法：

```python
@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        return 'Logged in (POST)'
    else:
        return 'Show login form (GET)'
```
**注意**: 在实际使用中，[`request`](flask.request) 对象需要从 [`flask`](flask) 模块导入。

## 5. 模板渲染

Flask使用Jinja2作为默认模板引擎。

### 5.1. 创建模板文件

在项目根目录下创建一个名为 `templates` 的文件夹，并在其中创建 [`index.html`](templates/index.html) 文件：

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>{{ title }}</title>
</head>
<body>
    <h1>{{ message }}</h1>
</body>
</html>
```

### 5.2. 渲染模板

修改 [`app.py`](app.py) 文件：

```python
from flask import Flask, render_template

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html', title='主页', message='欢迎来到我的Flask应用！')

if __name__ == '__main__':
    app.run(debug=True)
```
**注意**: [`render_template`](flask.render_template) 函数需要从 [`flask`](flask) 模块导入。

## 6. 静态文件

在项目根目录下创建一个名为 `static` 的文件夹，用于存放CSS、JavaScript和图片等静态文件。

例如，创建一个 [`static/style.css`](static/style.css) 文件：

```css
h1 {
    color: blue;
}
```

修改 [`templates/index.html`](templates/index.html) 引入静态文件：

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>{{ title }}</title>
    <link rel="stylesheet" href="{{ url_for('static', filename='style.css') }}">
</head>
<body>
    <h1>{{ message }}</h1>
</body>
</html>
```
**注意**: [`url_for`](flask.url_for) 函数需要从 [`flask`](flask) 模块导入。
