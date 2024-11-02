import axios from "axios";
import fs from "fs";

let allProducts = [];

async function fetchAllProducts(page = 1) {
  try {
    console.log(page);
    const response = await axios.get(
      `https://gafary.sa/api/v1/products?sort_by=created_at&order=desc&per_page=8&page=${page}`
    );
    const data = response.data.data.products;
    if (data && data.data && data.data.length > 0) {
      allProducts = allProducts.concat(data.data);

      // Check if there are more pages to fetch
      if (data.total > allProducts.length) {
        await fetchAllProducts(page + 1);
      }
    }
  } catch (error) {
    console.error("Error fetching products:", error);
  }
}

// fetchAllProducts()
//   .then(() => {
//     console.log(allProducts);
//     const productsJson = JSON.stringify(allProducts, null, 2);
//     fs.writeFile("products.json", productsJson, (err) => {
//       if (err) throw err;
//       console.log("Products saved to products.json");
//     });
//   })
//   .catch((error) => {
//     console.error("Error:", error);
//   });

import { readFile } from "fs/promises";
import { Parser } from "json2csv";

function saveCSVToFile(csvData, filename) {
  fs.writeFile(filename, csvData, (err) => {
    if (err) {
      console.error("Error writing to CSV file", err);
    } else {
      console.log("CSV file saved successfully");
    }
  });
}

async function organise(data) {
  try {
    // console.log(data)
    const filteredData = data.filter((item) => item !== null);
    const flattenedData = filteredData.flat();
    // console.log(flattenedData);
    const json2csvParser = new Parser();
    const csv = json2csvParser.parse(flattenedData);
    // console.log(csv);
    saveCSVToFile(csv, `backup.csv`);
  } catch (err) {
    console.log("Error parsing JSON:", err);
  }
}

async function readJsonFile(filePath) {
  try {
    const data = await readFile(new URL(filePath, import.meta.url));
    const parsedData = JSON.parse(data);
    return parsedData;
  } catch (error) {
    console.error("Error reading JSON file:", error);
  }
}

(async () => {
  const products = await readJsonFile("./powerTools.json");
console.log(products)
const arrayOfArrays = Object.entries(products).map(([key, value]) => value);
organise(arrayOfArrays)
// console.log(arrayOfArrays);
})();
