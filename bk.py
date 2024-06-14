import pandas as pd
from flask import Flask, jsonify, send_from_directory

app = Flask(__name__)

# Read and process the CSV file
def process_csv():
    df = pd.read_csv('ItemData.csv')
    categories = df['CATEGORY_NAME'].unique()
    categories.sort()
    
    data = {}
    for category in categories:
        category_data = df[df['CATEGORY_NAME'] == category]
        images = category_data[['ITEM_IMAGE1', 'ITEM_IMAGE2', 'ITEM_IMAGE3', 'ITEM_IMAGE4', 'ITEM_IMAGE5', 'ITEM_IMAGE6']].values.flatten()
        images = [img for img in images if pd.notna(img)]
        
        files = []
        for i in range(1, 7):
            files.extend(category_data[['File Name' + str(i), 'File Category' + str(i)]].values)
        files = [{'url': f[0], 'name': f[1]} for f in files if pd.notna(f[0])]
        
        data[category] = {'images': images, 'files': files}
    
    return data

@app.route('/data', methods=['GET'])
def get_data():
    data = process_csv()
    return jsonify(data)

if __name__ == '__main__':
    app.run(debug=True)
