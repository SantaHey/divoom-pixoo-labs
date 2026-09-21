#!/usr/bin/python
"""
    Setup.py file for pixoo package
"""
from pathlib import Path

from setuptools import setup

setup(
    name='pixoo-next',
    version='0.1',
    author='TheSecondLugia',
    description='A library to easily communicate with the Divoom Pixoo 16/64 devices',
    license='CC BY-NC-SA',
    keywords=['pixoo', 'divoom', 'pixoo64', 'pixoo16'],
    long_description=(Path(__file__).parent / "README.md").read_text(),
    long_description_content_type='text/markdown',
    url='https://github.com/TheSecondLugia/pixoo-next',
    # packages=['pixoo'],
    project_urls={
        'Issue Tracker': 'https://github.com/TheSecondLugia/pixoo-next/issues',
        'Source': 'https://github.com/TheSecondLugia/pixoo-next'
    },
    install_requires=[
        'Flask ~= 3.0.3',
        'requests ~= 2.32.3',
        'pillow ~= 10.4.0'
    ],
    python_requires='>=3.10'
)
