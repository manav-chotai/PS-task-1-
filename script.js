const DATA_KEYS = {
    product: 'Product_Name',
    brand: 'Brand_Name',
    category: 'Category',
    fat: 'Fat_Content(g)',
    calories: 'Calories(kcal)',
    serving: 'Serving_Size(g)',
    sugar: 'Sugar_Content(g)'
};

let fullData = [];

document.addEventListener('DOMContentLoaded', () => {
    if (!Array.isArray(window.SNACK_DATA) || window.SNACK_DATA.length === 0) {
        alert('Dataset not found. Please check data.js file.');
        return;
    }

    fullData = window.SNACK_DATA.map((row, idx) => ({
        ...row,
        __id: idx,
        [DATA_KEYS.fat]: Number(row[DATA_KEYS.fat]),
        [DATA_KEYS.calories]: Number(row[DATA_KEYS.calories]),
        [DATA_KEYS.serving]: Number(row[DATA_KEYS.serving]),
        [DATA_KEYS.sugar]: Number(row[DATA_KEYS.sugar]),
        Calories_Per_Fat: Number(row[DATA_KEYS.calories]) / Math.max(Number(row[DATA_KEYS.fat]), 1)
    }));

    initializeFilters(fullData);
    bindEvents();
    applyFiltersAndRender();
});

function initializeFilters(data) {
    const categoryFilter = document.getElementById('categoryFilter');
    const brandFilter = document.getElementById('brandFilter');
    const fatRange = document.getElementById('fatRange');
    const calRange = document.getElementById('calRange');
    const windowSize = document.getElementById('windowSize');

    const categories = ['All', ...new Set(data.map(d => d[DATA_KEYS.category]))];
    const brands = ['All', ...new Set(data.map(d => d[DATA_KEYS.brand]))];

    categoryFilter.innerHTML = categories.map(c => `<option value="${c}">${c}</option>`).join('');
    brandFilter.innerHTML = brands.map(b => `<option value="${b}">${b}</option>`).join('');

    const maxFat = Math.max(...data.map(d => d[DATA_KEYS.fat]));
    const maxCal = Math.max(...data.map(d => d[DATA_KEYS.calories]));

    fatRange.max = String(maxFat);
    fatRange.value = String(maxFat);
    calRange.max = String(maxCal);
    calRange.value = String(maxCal);
    windowSize.max = String(data.length);
    windowSize.value = String(data.length);

    updateRangeLabels();
}

function bindEvents() {
    ['categoryFilter', 'brandFilter', 'fatRange', 'calRange', 'windowSize'].forEach(id => {
        document.getElementById(id).addEventListener('input', () => {
            updateRangeLabels();
            applyFiltersAndRender();
        });
        document.getElementById(id).addEventListener('change', () => {
            updateRangeLabels();
            applyFiltersAndRender();
        });
    });

    document.getElementById('resetFilters').addEventListener('click', () => {
        initializeFilters(fullData);
        applyFiltersAndRender();
    });
}

function updateRangeLabels() {
    document.getElementById('fatRangeValue').textContent = document.getElementById('fatRange').value;
    document.getElementById('calRangeValue').textContent = document.getElementById('calRange').value;
    document.getElementById('windowSizeValue').textContent = document.getElementById('windowSize').value;
}

function applyFiltersAndRender() {
    const category = document.getElementById('categoryFilter').value;
    const brand = document.getElementById('brandFilter').value;
    const maxFat = Number(document.getElementById('fatRange').value);
    const maxCal = Number(document.getElementById('calRange').value);
    const windowSize = Number(document.getElementById('windowSize').value);

    const filtered = fullData
        .filter(d => (category === 'All' || d[DATA_KEYS.category] === category))
        .filter(d => (brand === 'All' || d[DATA_KEYS.brand] === brand))
        .filter(d => d[DATA_KEYS.fat] <= maxFat)
        .filter(d => d[DATA_KEYS.calories] <= maxCal)
        .slice(0, windowSize);

    renderCharts(filtered);
}

function renderCharts(data) {
    if (!data.length) {
        ['scatterRegression', 'barCategoryCalories', 'barCategoryFat', 'barBrandCalories', 'pieChart', 'lineChart', 'boxPlotCalories', 'boxPlotFat', 'heatmap']
            .forEach(id => Plotly.purge(id));
        return;
    }

    const palette = ['#2ecc71', '#3498db', '#e67e22', '#9b59b6', '#e74c3c', '#1abc9c', '#34495e'];

    // 1. Main Relationship (Regression) - Scatter Plot + Regression Line
    const hoverText = data.map(d => `${d[DATA_KEYS.product]}<br>Category: ${d[DATA_KEYS.category]}<br>Brand: ${d[DATA_KEYS.brand]}`);
    const regression = linearRegression(data.map(d => d[DATA_KEYS.fat]), data.map(d => d[DATA_KEYS.calories]));
    const minFat = Math.min(...data.map(d => d[DATA_KEYS.fat]));
    const maxFat = Math.max(...data.map(d => d[DATA_KEYS.fat]));
    
    const scatterRegressionTraces = [{
        x: data.map(d => d[DATA_KEYS.fat]),
        y: data.map(d => d[DATA_KEYS.calories]),
        mode: 'markers',
        type: 'scatter',
        name: 'Data Points',
        text: hoverText,
        hovertemplate: '%{text}<br>Fat: %{x} g<br>Calories: %{y} kcal<extra></extra>',
        marker: { size: 10, color: '#3498db', opacity: 0.75 }
    }, {
        x: [minFat, maxFat],
        y: [regression.slope * minFat + regression.intercept, regression.slope * maxFat + regression.intercept],
        mode: 'lines',
        type: 'scatter',
        name: 'Regression Line',
        line: { color: '#e74c3c', width: 3, dash: 'dash' },
        hovertemplate: 'Regression<br>Fat: %{x} g<br>Predicted: %{y:.0f} kcal<extra></extra>'
    }];

    Plotly.newPlot('scatterRegression', scatterRegressionTraces, {
        xaxis: { title: 'Fat Content (g)' },
        yaxis: { title: 'Calories (kcal)' },
        margin: { t: 20 },
        legend: { orientation: 'h', y: -0.15 }
    }, { responsive: true });

    // 2. Category vs Average Calories - Bar Chart
    const categoryAvgCal = groupAverage(data, DATA_KEYS.category, DATA_KEYS.calories);
    Plotly.newPlot('barCategoryCalories', [{
        x: Object.keys(categoryAvgCal),
        y: Object.values(categoryAvgCal),
        type: 'bar',
        marker: { color: '#2ecc71' },
        hovertemplate: 'Category: %{x}<br>Avg Calories: %{y:.1f} kcal<extra></extra>'
    }], {
        xaxis: { title: 'Category', tickangle: -25 },
        yaxis: { title: 'Average Calories (kcal)' },
        margin: { t: 20, b: 80 }
    }, { responsive: true });

    // 3. Category vs Average Fat Content - Bar Chart
    const categoryAvgFat = groupAverage(data, DATA_KEYS.category, DATA_KEYS.fat);
    Plotly.newPlot('barCategoryFat', [{
        x: Object.keys(categoryAvgFat),
        y: Object.values(categoryAvgFat),
        type: 'bar',
        marker: { color: '#3498db' },
        hovertemplate: 'Category: %{x}<br>Avg Fat: %{y:.1f} g<extra></extra>'
    }], {
        xaxis: { title: 'Category', tickangle: -25 },
        yaxis: { title: 'Average Fat Content (g)' },
        margin: { t: 20, b: 80 }
    }, { responsive: true });

    // 4. Brand vs Average Calories - Bar Chart
    const brandAvgCal = groupAverage(data, DATA_KEYS.brand, DATA_KEYS.calories);
    Plotly.newPlot('barBrandCalories', [{
        x: Object.keys(brandAvgCal),
        y: Object.values(brandAvgCal),
        type: 'bar',
        marker: { color: '#e67e22' },
        hovertemplate: 'Brand: %{x}<br>Avg Calories: %{y:.1f} kcal<extra></extra>'
    }], {
        xaxis: { title: 'Brand', tickangle: -25 },
        yaxis: { title: 'Average Calories (kcal)' },
        margin: { t: 20, b: 100 }
    }, { responsive: true });

    // 5. Distribution of Products - Pie Chart
    const categoryCount = groupCount(data, DATA_KEYS.category);
    Plotly.newPlot('pieChart', [{
        labels: Object.keys(categoryCount),
        values: Object.values(categoryCount),
        type: 'pie',
        hovertemplate: 'Category: %{label}<br>Count: %{value}<br>%{percent}<extra></extra>'
    }], {
        margin: { t: 20, b: 20, l: 0, r: 0 }
    }, { responsive: true });

    // 6. Trend Analysis - Line Chart (Fat vs Calories sorted)
    const sorted = [...data].sort((a, b) => a[DATA_KEYS.fat] - b[DATA_KEYS.fat]);
    Plotly.newPlot('lineChart', [{
        x: sorted.map(d => d[DATA_KEYS.fat]),
        y: sorted.map(d => d[DATA_KEYS.calories]),
        mode: 'lines+markers',
        type: 'scatter',
        text: sorted.map(d => `${d[DATA_KEYS.product]} | ${d[DATA_KEYS.category]}`),
        hovertemplate: '%{text}<br>Fat: %{x} g<br>Calories: %{y} kcal<extra></extra>',
        line: { color: '#9b59b6', width: 2 },
        marker: { size: 6 }
    }], {
        xaxis: { title: 'Fat Content (g)' },
        yaxis: { title: 'Calories (kcal)' },
        margin: { t: 20 }
    }, { responsive: true });

    // 7. Calories Spread & Outliers - Box Plot
    const categories = [...new Set(data.map(d => d[DATA_KEYS.category]))];
    const boxPlotsCalories = categories.map((cat, idx) => ({
        y: data.filter(d => d[DATA_KEYS.category] === cat).map(d => d[DATA_KEYS.calories]),
        type: 'box',
        name: cat,
        boxpoints: 'outliers',
        marker: { color: palette[idx % palette.length] },
        hovertemplate: 'Category: ' + cat + '<br>Calories: %{y} kcal<extra></extra>'
    }));
    Plotly.newPlot('boxPlotCalories', boxPlotsCalories, {
        xaxis: { title: 'Category' },
        yaxis: { title: 'Calories (kcal)' },
        margin: { t: 20, b: 80 }
    }, { responsive: true });

    // 8. Fat Content Spread & Outliers - Box Plot
    const boxPlotsFat = categories.map((cat, idx) => ({
        y: data.filter(d => d[DATA_KEYS.category] === cat).map(d => d[DATA_KEYS.fat]),
        type: 'box',
        name: cat,
        boxpoints: 'outliers',
        marker: { color: palette[idx % palette.length] },
        hovertemplate: 'Category: ' + cat + '<br>Fat: %{y} g<extra></extra>'
    }));
    Plotly.newPlot('boxPlotFat', boxPlotsFat, {
        xaxis: { title: 'Category' },
        yaxis: { title: 'Fat Content (g)' },
        margin: { t: 20, b: 80 }
    }, { responsive: true });

    // 9. Correlation Analysis - Heatmap (Fat, Calories, Sugar)
    const features = [DATA_KEYS.fat, DATA_KEYS.calories, DATA_KEYS.sugar];
    const corrMatrix = features.map(rowKey => features.map(colKey => correlation(data, rowKey, colKey)));
    Plotly.newPlot('heatmap', [{
        z: corrMatrix,
        x: features,
        y: features,
        type: 'heatmap',
        colorscale: 'RdBu',
        zmid: 0,
        hovertemplate: 'X: %{x}<br>Y: %{y}<br>Corr: %{z:.3f}<extra></extra>'
    }], {
        margin: { t: 20, l: 100, b: 100 }
    }, { responsive: true });
}

function groupAverage(data, groupKey, metricKey) {
    const map = {};
    data.forEach(d => {
        const k = d[groupKey] || 'Unknown';
        if (!map[k]) {
            map[k] = { sum: 0, count: 0 };
        }
        map[k].sum += Number(d[metricKey]);
        map[k].count += 1;
    });

    const result = {};
    Object.keys(map).forEach(k => {
        result[k] = map[k].sum / map[k].count;
    });
    return result;
}

function groupCount(data, groupKey) {
    const map = {};
    data.forEach(d => {
        const k = d[groupKey] || 'Unknown';
        map[k] = (map[k] || 0) + 1;
    });
    return map;
}

function correlation(data, key1, key2) {
    const pairs = data
        .map(d => [Number(d[key1]), Number(d[key2])])
        .filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y));

    const n = pairs.length;
    if (!n) return 0;

    const sumX = pairs.reduce((acc, [x]) => acc + x, 0);
    const sumY = pairs.reduce((acc, [, y]) => acc + y, 0);
    const meanX = sumX / n;
    const meanY = sumY / n;

    let numerator = 0;
    let denomX = 0;
    let denomY = 0;

    pairs.forEach(([x, y]) => {
        const dx = x - meanX;
        const dy = y - meanY;
        numerator += dx * dy;
        denomX += dx * dx;
        denomY += dy * dy;
    });

    const denominator = Math.sqrt(denomX * denomY);
    return denominator === 0 ? 0 : numerator / denominator;
}

function linearRegression(xValues, yValues) {
    const n = Math.min(xValues.length, yValues.length);
    if (!n) {
        return { slope: 0, intercept: 0 };
    }

    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumX2 = 0;

    for (let i = 0; i < n; i++) {
        const x = Number(xValues[i]);
        const y = Number(yValues[i]);
        sumX += x;
        sumY += y;
        sumXY += x * y;
        sumX2 += x * x;
    }

    const denominator = (n * sumX2) - (sumX * sumX);
    const slope = denominator === 0 ? 0 : ((n * sumXY) - (sumX * sumY)) / denominator;
    const intercept = (sumY - (slope * sumX)) / n;

    return { slope, intercept };
}