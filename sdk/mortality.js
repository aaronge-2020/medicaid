import { fetchData, localforage } from "./httpMethods.js";
import Plotly from "https://cdn.jsdelivr.net/npm/plotly.js-dist/+esm";

async function obtainMortalityData() {
  const cleanedData = await localforage.getItem("cleanedData");
  if (cleanedData) return cleanedData;

  // URLs to fetch
  const urls = [
    "https://data.cdc.gov/resource/muzy-jte6.json",
    "https://data.cdc.gov/resource/3yf8-kanr.json",
  ];

  // Fetch data from URLs using fetchData function
  const dataArrays = await Promise.all(urls.map((url) => fetchData(url)));

  // rename the weekendingdate variable of the JSON dataArrays[1] to week_ending_date
  dataArrays[1].forEach((item) => {
    item["week_ending_date"] = item["weekendingdate"].substring(0, 10);
    delete item["weekendingdate"];

  });

  // rename the allcause variable of the JSON dataArrays[1] to all_cause
  dataArrays[1].forEach((item) => {
    item["all_cause"] = item["allcause"];
    delete item["allcause"];
  });

  // rename the naturalcause variable of the JSON dataArrays[1] to natural_cause
  dataArrays[1].forEach((item) => {
    item["natural_cause"] = item["naturalcause"];
    delete item["naturalcause"];
  });

  // Identify common columns
  const commonColumns = dataArrays[0].reduce((columns, item) => {
    Object.keys(item).forEach((key) => columns.add(key));
    return columns;
  }, new Set());

  dataArrays[1].forEach((item) => {
    Object.keys(item).forEach((key) => {
      if (!commonColumns.has(key)) commonColumns.delete(key);
    });
  });

  // Clean, preprocess, and fill missing common columns with 0
  dataArrays.forEach((data) => {
    data.forEach((item) => {
      commonColumns.forEach((column) => {
        // Convert to number if possible
        if (item[column] && !isNaN(item[column]))
          item[column] = Number(item[column]);
        // Fill missing common columns with 0
        if (!item.hasOwnProperty(column)) item[column] = 0;
      });
      // Remove any extra columns that are not common
      Object.keys(item).forEach((key) => {
        if (!commonColumns.has(key)) delete item[key];
      });
    });
  });

  // Merge the data
  const mergedData = [].concat(...dataArrays);

  // Save to cache
  await localforage.setItem("cleanedData", mergedData);

  return mergedData;
}
// Define the function to plot the time series
function plotMortalityTimeSeriesWithPrices(divID, data, startDate, endDate, causes, jurisdiction, drugPrices) {
  // Filter the data by date range
  const filteredData = data.filter(
    (row) =>
      row.week_ending_date >= startDate && row.week_ending_date <= endDate && row.jurisdiction_of_occurrence === jurisdiction
  );

  // Prepare the data for plotting
  const mortalityData = causes.map((cause) => {
    return {
      x: filteredData.map((row) => new Date(row.week_ending_date)),
      y: filteredData.map((row) => row[cause]),
      type: "scatter",
      mode: "markers",
      name: cause,
    };
  });

  drugPrices.map((drug)=>{
    drug.type = "scatter";
    drug.mode = "markers";
    drug.xaxis = 'x2', // Secondary X-axis
    drug.yaxis = 'y2'  // Secondary Y-axis
    drug.x.map((date)=>{ return new Date(date)})
  })


  var layout = {
    xaxis: {title: 'Date for mortality data'},
    yaxis: {title: 'Number of Deaths'},
    xaxis2: {
      title: 'Date for drug prices',
      overlaying: 'x', // Overlaying primary X-axis
      side: 'top'     // Positioning on the top
    },
    yaxis2: {
      title: 'Drug Price per Unit',
      overlaying: 'y', // Overlaying primary Y-axis
      side: 'right'   // Positioning on the right
    },
    showlegend: true,
  };
  // Plot the graph
  Plotly.newPlot(divID, [mortalityData[0], drugPrices[0]], layout);
  return [mortalityData, drugPrices[0]];
}

// Define the function to plot the time series
function plotMortalityTimeSeries(divID, data, startDate, endDate, causes, jurisdiction) {
    // Filter the data by date range
    const filteredData = data.filter(
      (row) =>
        row.week_ending_date >= startDate && row.week_ending_date <= endDate && row.jurisdiction_of_occurrence === jurisdiction
    );
  
    // Prepare the data for plotting
    const plotData = causes.map((cause) => {
      return {
        x: filteredData.map((row) => row.week_ending_date),
        y: filteredData.map((row) => row[cause]),
        type: "scatter",
        mode: "markers",
        name: cause,
      };
    });
  
    // Define the layout
    const layout = {
      title: "Time Series of Deaths",
      xaxis: { title: "Date" },
      yaxis: { title: "Number of Deaths" },
      showlegend: true,
    };
  
    // Plot the graph
    Plotly.newPlot(divID, plotData, layout);
  }


export { obtainMortalityData, plotMortalityTimeSeries, plotMortalityTimeSeriesWithPrices };
