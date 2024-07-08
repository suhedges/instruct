from flask import Flask, render_template, jsonify
import pandas as pd
import os
from collections import defaultdict
import random
import re
from functools import lru_cache

app = Flask(__name__)

EXCLUDED_FILE_NAMES = ["Warranty Information", "Technical Bulletin", "Line Drawing", "Specification Sheet", "Full Engineering Drawing"]
HIGHLIGHT_COLORS = {
    'video': 'purple',
    'manual': 'bright-orange',
    'both': 'light-green',
    'catalog_sds': '#053856'
}

@lru_cache(maxsize=1)
def load_data():
    local_hdf5_path = os.path.join(os.path.dirname(__file__), 'ItemData.h5')
    df = pd.read_hdf(local_hdf5_path)
    return df

def normalize_youtube_url(url):
    # List of patterns to match different YouTube URL formats
    patterns = [
        r'(?:v=|\/embed\/|\/watch\?v=|\/watch\?v%3D|\/shorts\/|\/v\/|youtu\.be\/)([\w-]+)',  # Comprehensive pattern
        r'youtube\.com\/shorts\/([\w-]+)',  # YouTube Shorts
        r'youtube\.com\/watch\?v=([\w-]+)',  # YouTube watch URL
        r'youtu\.be\/([\w-]+)',  # Shortened URL format
        r'youtube\.com\/v\/([\w-]+)',  # YouTube v format
        r'youtube\.com\/embed\/([\w-]+)'  # YouTube embed format
    ]
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            video_id = match.group(1)
            return f'https://www.youtube.com/embed/{video_id}'
    return url

@lru_cache(maxsize=128)
def get_random_videos(categories, count=6):
    df = load_data()
    video_dict = defaultdict(set)
    for category in categories:
        category_data = df[df['CATEGORY_NAME'] == category]
        for i in range(1, 7):
            file_name_col = f'File Name{i}'
            file_category_col = f'File Category{i}'
            if file_name_col in category_data.columns and file_category_col in category_data.columns:
                file_data = category_data[[file_name_col, file_category_col]].dropna()
                for file_name, file_category in file_data.values:
                    if "Video Link" in file_category and file_name:
                        normalized_url = normalize_youtube_url(file_name)
                        title = "Video"
                        parts = file_category.split("|")
                        if len(parts) > 1:
                            title = parts[1].strip()
                        else:
                            title = "YouTube"
                        video_dict[normalized_url].add(title)
    videos = [(url, titles.pop()) for url, titles in video_dict.items() if url]
    random.shuffle(videos)
    return videos[:count]

def get_child_categories_with_videos(parent_category):
    df = load_data()
    child_categories = sorted(df[df['LEVEL1'] == parent_category]['CATEGORY_NAME'].unique())
    valid_child_categories = []
    for child in child_categories:
        category_data = df[df['CATEGORY_NAME'] == child]
        has_video = False
        for i in range(1, 7):
            file_name_col = f'File Name{i}'
            file_category_col = f'File Category{i}'
            if file_name_col in category_data.columns and file_category_col in category_data.columns:
                file_data = category_data[[file_name_col, file_category_col]].dropna()
                for file_name, file_category in file_data.values:
                    if "Video Link" in file_category and file_name:
                        has_video = True
                        break
            if has_video:
                break
        if has_video:
            valid_child_categories.append(child)
    return valid_child_categories

@app.route('/')
def index():
    df = load_data()
    df['LEVEL1'] = df['LEVEL1'].fillna('').astype(str)
    parent_categories = sorted(df['LEVEL1'].unique())
    valid_parent_categories = []
    for parent in parent_categories:
        if get_child_categories_with_videos(parent):
            valid_parent_categories.append(parent)
    initial_videos = get_random_videos(tuple(df['CATEGORY_NAME'].unique()))

    return render_template('index.html', parent_categories=valid_parent_categories, initial_videos=initial_videos)

@app.route('/parent-categories', methods=['GET'])
def get_parent_categories():
    df = load_data()
    df['LEVEL1'] = df['LEVEL1'].fillna('').astype(str)
    parent_categories = sorted(df['LEVEL1'].unique())

    return jsonify(parent_categories=parent_categories)

@app.route('/videos/<parent_category>', methods=['GET'])
def get_videos_by_parent_category(parent_category):
    valid_child_categories = get_child_categories_with_videos(parent_category)
    random_videos = get_random_videos(tuple(valid_child_categories))

    return jsonify({
        'child_categories': valid_child_categories,
        'random_videos': random_videos
    })

@app.route('/videos/<parent_category>/<child_category>', methods=['GET'])
def get_videos_by_child_category(parent_category, child_category):
    df = load_data()
    category_data = df[df['CATEGORY_NAME'] == child_category]
    video_dict = defaultdict(set)

    for i in range(1, 7):
        file_name_col = f'File Name{i}'
        file_category_col = f'File Category{i}'
        if file_name_col in category_data.columns and file_category_col in category_data.columns:
            file_data = category_data[[file_name_col, file_category_col]].dropna()
            for file_name, file_category in file_data.values:
                if "Video Link" in file_category and file_name:
                    normalized_url = normalize_youtube_url(file_name)
                    title = "Video"
                    parts = file_category.split("|")
                    if len(parts) > 1:
                        title = parts[1].strip()
                    else:
                        title = "YouTube"
                    video_dict[normalized_url].add(title)

    videos = [(url, titles.pop()) for url, titles in video_dict.items() if url]

    return jsonify({
        'videos': videos
    })

if __name__ == '__main__':
    app.run(debug=True)
