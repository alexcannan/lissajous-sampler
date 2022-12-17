from setuptools import setup, find_packages

setup(
    name='lissamp',
    author='Alex Cannan',
    author_email='alexfcannan@gmail.com',
    version='0.1',
    packages=find_packages(),
    install_requires=[
        'Pillow',
        'fastapi',
        'gunicorn',
        'uvicorn[standard]',
        'jinja2',
        'motor',
        'loguru',
        'pydantic',
    ],
)