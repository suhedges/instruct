from flask import Flask, render_template, jsonify
import pandas as pd
import os
from collections import defaultdict
import random
import re
from functools import lru_cache
import urllib.parse

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
    match = re.search(r'(?:v=|\/embed\/|\/watch\?v=|\/watch\?v%3D|\/shorts\/|\/v\/|youtu\.be\/)([\w-]+)', url)
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
        file_data = category_data[['File Name1', 'File Category1']].dropna()

        for file_name, file_category in file_data.values:
            if "Video Link" in file_category and file_name and not file_name.endswith('.pdf'):
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

@app.route('/')
def index():
    df = load_data()
    df['LEVEL1'] = df['LEVEL1'].fillna('').astype(str)
    parent_categories = sorted(df['LEVEL1'].unique())
    initial_videos = get_random_videos(tuple(df['CATEGORY_NAME'].unique()))

    return render_template('index.html', parent_categories=parent_categories, initial_videos=initial_videos)

@app.route('/parent-categories', methods=['GET'])
def get_parent_categories():
    df = load_data()
    df['LEVEL1'] = df['LEVEL1'].fillna('').astype(str)
    parent_categories = sorted(df['LEVEL1'].unique())

    return jsonify(parent_categories=parent_categories)

@app.route('/videos/<parent_category>', methods=['GET'])
def get_videos_by_parent_category(parent_category):
    parent_category = urllib.parse.unquote(parent_category)
    df = load_data()
    df['LEVEL1'] = df['LEVEL1'].fillna('').astype(str)
    child_categories = sorted(df[df['LEVEL1'] == parent_category]['CATEGORY_NAME'].unique())
    random_videos = get_random_videos(tuple(child_categories))

    return jsonify({
        'child_categories': child_categories,
        'random_videos': random_videos
    })

@app.route('/videos/<parent_category>/<child_category>', methods=['GET'])
def get_videos_by_child_category(parent_category, child_category):
    parent_category = urllib.parse.unquote(parent_category)
    child_category = urllib.parse.unquote(child_category)
    df = load_data()
    category_data = df[df['CATEGORY_NAME'] == child_category]
    video_dict = defaultdict(set)
    pdfs = defaultdict(set)

    file_data = category_data[['File Name1', 'File Category1']].dropna()

    for file_name, file_category in file_data.values:
        if file_name.endswith('.pdf'):
            pdf_name = file_name.split('/')[-1]
            pdfs[file_category].add((file_name, pdf_name))
        elif "Video Link" in file_category and file_name and not file_name.endswith('.pdf'):
            normalized_url = normalize_youtube_url(file_name)
            title = "Video"
            parts = file_category.split("|")
            if len(parts) > 1:
                title = parts[1].strip()
            else:
                title = "YouTube"
            video_dict[normalized_url].add(title)

    videos = [(url, titles.pop()) for url, titles in video_dict.items() if url]
    pdfs = {key: sorted(value, key=lambda x: x[1]) for key, value in pdfs.items()}

    return jsonify({
        'videos': videos,
        'pdfs': pdfs
    })

if __name__ == '__main__':
    app.run(debug=False, host='0.0.0.0', port=int(os.environ.get('PORT', 5000)))
