import { fetchData, localforage } from "./httpMethods.js";
import Plotly from "https://cdn.jsdelivr.net/npm/plotly.js-dist/+esm";
import {getRxcuiFromNdc} from "./rxNorm.js";
import { getDrugContext } from "./fda.js";


const URLS = {
  patent: "http://127.0.0.1:5500/orange_book/patent.txt",
  exclusivity: "http://127.0.0.1:5500/orange_book/exclusivity.txt",
  products: "http://127.0.0.1:5500/orange_book/products.txt",
};

function parseFDAData(text) {
  const lines = text.split("\n");

  // Get field names from first row
  const headers = lines[0].split("~");

  const data = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cols = line.split("~");
    const row = {};

    // Map values to field names
    for (let j = 0; j < cols.length; j++) {
      row[headers[j]] = cols[j];
    }

    data.push(row);
  }

  return JSON.stringify(data);
}

async function obtainOrangeBook() {
  let patent = await localforage.getItem("patent");

  let products = await localforage.getItem("products");

  let exclusivity = await localforage.getItem("exclusivity");

  // If patent, products, or exclusivity are not in localforage, fetch them from the URLs and store them in localforage
  if (!patent || !products || !exclusivity) {
    const unparsedPatent = await (await fetch(URLS["patent"])).text();
    const unparsedProducts = await (await fetch(URLS["products"])).text();
    const unparsedExclusivity = await (await fetch(URLS["exclusivity"])).text();

    patent = JSON.parse(parseFDAData(unparsedPatent));
    products = JSON.parse(parseFDAData(unparsedProducts));
    exclusivity = JSON.parse(parseFDAData(unparsedExclusivity));

    localforage.setItem("patent", patent);
    localforage.setItem("products", products);
    localforage.setItem("exclusivity", exclusivity);
  }

  return [patent, products, exclusivity];
}

async function obtainPatentDataFromApplicationNumber(number) {
  let [patent, products, exclusivity] = await obtainOrangeBook();

  //   Filter the data to only include the patent, products, and exclusivity data for the given application number
  const patentData = patent.filter((item) => item.Appl_No === number);
  const productsData = products.filter((item) => item.Appl_No === number);
  const exclusivityData = exclusivity.filter((item) => item.Appl_No === number);

  //   Concatenate all the data into a single JSON object and return it
  const data = {
    patent: patentData,
    products: productsData,
    exclusivity: exclusivityData,
  };

  return data;
}

async function obtainPatentDataFromNDC(NDC) {
  let [patent, products, exclusivity] = await obtainOrangeBook();


  const Rxcui = await getRxcuiFromNdc(NDC);

  const drugContext = await getDrugContext(Rxcui)

  const number = parseInt(drugContext.application_number)


  //   Filter the data to only include the patent, products, and exclusivity data for the given application number
  const patentData = patent.filter((item) => item.Appl_No === number);
  const productsData = products.filter((item) => item.Appl_No === number);
  const exclusivityData = exclusivity.filter((item) => item.Appl_No === number);

  //   Concatenate all the data into a single JSON object and return it
  const data = {
    patent: patentData,
    products: productsData,
    exclusivity: exclusivityData,
  };

  return data;
}

export { obtainPatentDataFromApplicationNumber, obtainPatentDataFromNDC };
