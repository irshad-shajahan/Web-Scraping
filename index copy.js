import puppeteer from "puppeteer";
import fs from "fs";
import { url } from "inspector";
import { Parser } from "json2csv";
import translate from "@iamtraction/google-translate";

const baseUrl = "https://janoubco.com/";

const links = [
  {
    name: "كشافات سلندر",
    subCatId: "664a4486b1c689cd118f5d3b",
    url: "https://janoubco.com/%D9%83%D8%B4%D8%A7%D9%81%D8%A7%D8%AA-%D8%B3%D9%84%D9%86%D8%AF%D8%B1-1",
  },
  {
    name: "كشافات لطش سقف",
    subCatId: "664a45a1b1c689cd118f5d42",
    url: "https://janoubco.com/%D9%84%D8%B7%D8%B4-%D8%B8%D8%A7%D9%87%D8%B1",
  },
  {
    name: "داون لايت",
    subCatId: "664a4602b1c689cd118f5d49",
    url: "https://janoubco.com/%D8%AF%D8%A7%D9%88%D9%86-%D9%84%D8%A7%D9%8A%D8%AA",
  },
  {
    name: "إطار جرم سبوت لايت",
    subCatId: "664a5cc758dce04055a05f31",
    url: "https://janoubco.com/%D8%A5%D8%B7%D8%A7%D8%B1-%D8%B3%D8%A8%D9%88%D8%AA-%D9%84%D8%A7%D9%8A%D8%AA",
  },
  {
    name: "لمبات قزاز تيوب",
    subCatId: "664a5d0f58dce04055a05f38",
    url: "https://janoubco.com/%D9%84%D9%85%D8%A8%D8%A7%D8%AA-%D9%82%D8%B2%D8%A7%D8%B2-%D8%AA%D9%8A%D9%88%D8%A8",
  },
  {
    name: "لمبات كروية",
    subCatId: "664a5d5d58dce04055a05f3f",
    url: "https://janoubco.com/%D9%84%D9%85%D8%A8%D8%A7%D8%AA-%D9%83%D8%B1%D9%88%D9%8A%D8%A9",
  },
  {
    name: "ليد بانل",
    subCatId: "664a5d9e58dce04055a05f46",
    url: "https://janoubco.com/%D9%84%D9%8A%D8%AF-%D8%A8%D8%A7%D9%86%D9%84",
  },
  {
    name: "لمبة ليد مسطحة",
    subCatId: "664a5dd358dce04055a05f4d",
    url: "https://janoubco.com/%D9%84%D9%85%D8%A8%D8%A9-%D9%84%D9%8A%D8%AF-%D9%85%D8%B3%D8%B7%D8%AD%D8%A9",
  },
  {
    name: "لمبة ليد فيلمونت ديكورية",
    subCatId: "664a5e0258dce04055a05f54",
    url: "https://janoubco.com/%D9%84%D9%85%D8%A8%D8%A9-%D9%84%D9%8A%D8%AF-%D9%81%D9%8A%D9%84%D9%85%D9%88%D9%86%D8%AA-%D8%AF%D9%8A%D9%83%D9%88%D8%B1%D9%8A%D8%A9",
  },
  {
    name: "لمبات GU10 سبوت لايت",
    subCatId: "664a5e3c58dce04055a05f5b",
    url: "https://janoubco.com/%D9%84%D9%85%D8%A8%D8%A7%D8%AA-gu10",
  },

];

async function scrape() {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  await page.goto(baseUrl);
  // Set screen size
  await page.setViewport({ width: 1080, height: 1024 });

  // const links = await page.$$eval(".module-banners .module-body", (banners) =>
  //   banners.map((e) => {
  //     return {
  //       url: e.querySelector("a").getAttribute("href"),
  //     };
  //   })
  // );

  const data = {};

  for (let i = 0; i < links.length; i++) {
    const subCategory = [];
    if (!links[i].url) continue;

    const newPage = await browser.newPage();
    await newPage.goto(`${links[i].url}?limit=10000`);

    try {
      await newPage.waitForSelector(".product-layout", { timeout: 10000 });
    } catch (error) {
      console.log(
        `Selector .product-layout not found on page: ${links[i].url}`
      );
      await newPage.close();
      continue;
    }

    const productLinks = await newPage.$$eval(".product-layout", (products) => {
      if (products.length > 0) {
        return products.map((e) => ({
          url: e.querySelector(".image > a").getAttribute("href") || "",
          // image: e.querySelector(".img-responsive")?.getAttribute("src") || "",
          // name: e.querySelector(".name > a")?.innerHTML || "",
          // price: e.querySelector(".price-normal")?.innerText || "",
          // actualPrice: e.querySelector(".booknow1 > span")?.innerHTML || "",
        }));
      }
    });
    for (let j = 0; j < productLinks.length; j++) {
      if (!productLinks[j].url) continue;
      const newProductPage = await browser.newPage();
      await newProductPage.goto(productLinks[j].url);

      try {
        await newProductPage.waitForSelector(".product-info", {
          timeout: 10000,
        });
      } catch (error) {
        console.log(
          `Selector .product-info not found on page: ${productLinks[i].url}`
        );
        await newProductPage.close();
        continue;
      }
      const productDetail = await newProductPage.evaluate(() => {
        const titleElement = document.querySelector(".title.page-title");
        const priceElement = document.querySelector(
          ".product-price span:nth-child(3)"
        );
        const priceElement2 = document.querySelector(
          ".booknow1 > span > span:nth-child(1)"
        );
        const descriptionElements =
          document.querySelectorAll(".product-info p");
        let description = "";
        descriptionElements.forEach((p, index) => {
          description += p.innerText;
          if (index < descriptionElements.length - 1) {
            description += "<br>";
          }
        });
        return {
          name: titleElement ? titleElement.innerText : "",
          actualPrice: priceElement ? priceElement2.innerText : "",
          offerPrice: priceElement ? priceElement.innerText : "",
          description: description,
        };
      });
      subCategory.push(productDetail);
      await newProductPage.close();
    }
    console.log("-------------------");
    console.log(subCategory);
    data[i] = subCategory;
    await newPage.close();
  }

  fs.writeFile("input.json", JSON.stringify(data), function (err) {
    if (err) throw err;
    console.log("complete");
  });

  browser.close();
}

// scrape()

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
  const categoryId = "664a3d90b1c689cd118f5d34";
  fs.readFile("./input.json", "utf8", async(err, jsonString) => {
    if (err) {
      console.log("Error reading file:", err);
      return;
    }
    try {
      const data = JSON.parse(jsonString); // Parse the JSON data/'
      const translateProduct = async (element, elem) => {
        try {
          const nameTranslation = await translate(element.name, { to: "en" });
          const descriptionTranslation = await translate(element.description, { to: "en" });
      
          return {
            productName: nameTranslation.text,
            arabicName: element.name,
            productDescription: descriptionTranslation.text,
            ardescription: element.description,
            productSubCategoryId: elem.subCatId,
            productCategoryId: categoryId,
            productPrice:element.offerPrice,
            productMrp:element.actualPrice
          };
        } catch (err) {
          console.error(err);
          return null;
        }
      };
      
      const finalData = await Promise.all(links.map(async (elem, index) => {
        if (data[index]) {
          if (data[index].length > 0) {
            const subCatData = await Promise.all(data[index].map(element => translateProduct(element, elem)));
            console.log('subCatData', subCatData);
            return subCatData;
          }
          return [];
        } else {
          return null;
        }
      }));
      
      const filteredData = finalData.filter(item => item !== null);
      const flattenedData = filteredData.flat();
      console.log(flattenedData);
      const json2csvParser = new Parser();
      const csv = json2csvParser.parse(flattenedData);
      console.log(csv);
      saveCSVToFile(csv, "data.csv");
    } catch (err) {
      console.log("Error parsing JSON:", err);
    }
  });
  // const data = [ 
  //   { name: "John Doe", age: 29, city: "New York" },
  //   { name: "Jane Smith", age: 34, city: "Los Angeles" },
  //   { name: "Sam Green", age: 23, city: "Chicago" },
  // ];
}

// organise();
