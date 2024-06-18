from flask import Flask, render_template, request
from flask_cors import CORS
import pandas as pd
import os
from collections import defaultdict
import re

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

EXCLUDED_FILE_NAMES = ["Warranty Information", "Technical Bulletin", "Line Drawing", "Specification Sheet", "Full Engineering Drawing"]
HIGHLIGHT_COLORS = {
    'video': 'purple',
    'manual': 'bright-orange',
    'both': 'light-green',
    'catalog_sds': '#053856'
}

def load_data():
    local_csv_path = os.path.join(os.path.dirname(__file__), 'comp.csv.gz')
    df = pd.read_csv(local_csv_path, compression='gzip', low_memory=False)
    return df

def get_category_highlight(category_data):
    has_video = any(category_data[f'File Category{i}'].dropna().str.contains("Video Link").any() for i in range(1, 7))
    has_manual = any(category_data[f'File Category{i}'].dropna().str.contains("Instruction/Installation Manual").any() for i in range(1, 7))
    has_catalog = any(category_data[f'File Category{i}'].dropna().str.contains("Catalog").any() for i in range(1, 7))
    has_sds = any(category_data[f'File Category{i}'].dropna().str.contains("SDS").any() for i in range(1, 7))
    
    if has_video and has_manual:
        return HIGHLIGHT_COLORS['both']
    elif has_video:
        return HIGHLIGHT_COLORS['video']
    elif has_manual:
        return HIGHLIGHT_COLORS['manual']
    elif has_catalog or has_sds:
        return HIGHLIGHT_COLORS['catalog_sds']
    return None

def normalize_youtube_url(url):
    match = re.search(r'(?:v=|\/embed\/|\/watch\?v=|\/watch\?v%3D|\/shorts\/|\/v\/|youtu\.be\/)([\w-]+)', url)
    if match:
        video_id = match.group(1)
        return f'https://www.youtube.com/embed/{video_id}'
    return url

@app.route('/')
def index():
    df = load_data()
    categories = sorted(df['CATEGORY_NAME'].unique())
    grouped_categories = defaultdict(list)
    category_highlights = {}

    for category in categories:
        category_data = df[df['CATEGORY_NAME'] == category]
        highlight = get_category_highlight(category_data)

        if highlight:
            category_highlights[category] = highlight
            first_letter = category[0].upper()
            grouped_categories[first_letter].append(category)

    sorted_grouped_categories = dict(sorted(grouped_categories.items()))
    header_classes = {letter: compute_header_class(categories, category_highlights) for letter, categories in sorted_grouped_categories.items()}
    
    return render_template('index.html', grouped_categories=sorted_grouped_categories, category_highlights=category_highlights, header_classes=header_classes)

def compute_header_class(categories, category_highlights):
    if any(category_highlights[c] == 'light-green' for c in categories):
        return 'light-green'
    elif any(category_highlights[c] == 'bright-orange' for c in categories):
        return 'bright-orange'
    elif any(category_highlights[c] == 'purple' for c in categories):
        return 'purple'
    elif any(category_highlights[c] == '#053856' for c in categories):
        return '#053856'
    return ''

@app.route('/category/<category_name>')
def category(category_name):
    df = load_data()
    category_data = df[df['CATEGORY_NAME'] == category_name]
    images = [category_data[f'ITEM_IMAGE{i}'].dropna().tolist() for i in range(1, 7)]
    images = [img for sublist in images for img in sublist]
    pdfs = defaultdict(set)
    video_dict = defaultdict(set)

    for i in range(1, 7):
        file_name_col = f'File Name{i}'
        file_category_col = f'File Category{i}'
        file_data = category_data[[file_name_col, file_category_col]].dropna()

        for file_name, file_category in file_data.values:
            if file_category in EXCLUDED_FILE_NAMES:
                continue

            if file_name.endswith('.pdf'):
                pdf_name = file_name.split('/')[-1]
                pdfs[file_category].add((file_name, pdf_name))
            elif file_name:
                normalized_url = normalize_youtube_url(file_name)
                title = "Video"
                if "Video Link" in file_category:
                    parts = file_category.split("|")
                    if len(parts) > 1:
                        title = parts[1].strip()
                    else:
                        title = "YouTube"

                video_dict[normalized_url].add(title)

    # Process video_dict to ensure preferred titles and unique URLs
    video_urls = set()
    videos = []
    for file_name, titles in video_dict.items():
        if file_name not in video_urls:
            video_urls.add(file_name)
            if "YouTube" in titles and len(titles) > 1:
                titles.remove("YouTube")
            title = titles.pop()
            videos.append((file_name, title))

    pdfs = {key: sorted(value, key=lambda x: x[1]) for key, value in pdfs.items()}
    videos = sorted(videos, key=lambda x: x[1])

    return render_template('category.html', category_name=category_name, images=images, pdfs=pdfs, videos=videos, enumerate=enumerate)

if __name__ == '__main__':
    app.run(debug=True)
