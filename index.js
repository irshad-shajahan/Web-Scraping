import puppeteer from "puppeteer";
import fs from "fs";
import { Parser } from "json2csv";
import translate from "@iamtraction/google-translate";
import { Chandlers2, Chandliers1, ExteriorLight, InteriorLight, LampShades, SwitchKeys1, SwitchKeys2, SwitchKeys3, WallLight } from "./links.js";

const baseUrl = "https://janoubco.com/";

// const links = [
//   {
//     name: "المنزل الذكي",
//     subCatId: "",
//     url: "https://janoubco.com/%D8%A7%D9%84%D9%85%D9%86%D8%B2%D9%84-%D8%A7%D9%84%D8%B0%D9%83%D9%8A",
//   },
  
// ];
const links = Chandlers2 

const categoryId = "664e27a5c5a95f89b2fa9885"
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
      const filteredData = data.filter(item => item !== null);
      const flattenedData = filteredData.flat();
      // console.log(flattenedData);
      const json2csvParser = new Parser();
      const csv = json2csvParser.parse(flattenedData);
      // console.log(csv);
      saveCSVToFile(csv, "data2.csv");
    } catch (err) {
      console.log("Error parsing JSON:", err);
    }
}

async function scrape() {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  // await page.goto(baseUrl);
  await page.setViewport({ width: 1080, height: 1024 });
  const data = {};
  const dataArray =[]

  for (let i = 0; i < links.length; i++) {
    const subCategory = [];
    if (!links[i].url) continue;

    const newPage = await browser.newPage();
    // await newPage.goto(`${links[i].url}?limit=10000`);
    try {
      await newPage.goto(`${links[i].url}?limit=10000`, { waitUntil: 'networkidle0' }); // Wait for full page load and network stability
    } catch (error) {
      console.error(`Error navigating to ${links[i].url}:`, error.message);
      await newPage.close();
      continue;
    }

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
        }));
      }
    });
    for (let j = 0; j < productLinks.length; j++) {
      const progress = ((((j+1)/productLinks.length)/links.length)*100).toFixed(2)
      console.log('Product ',j+1,' out of',productLinks.length,' in subcategory',i+1,'out of',links.length,'-',progress+'%')
      if (!productLinks[j].url) continue;
      const newProductPage = await browser.newPage();
      // await newProductPage.goto(productLinks[j].url);
      try {
        await newProductPage.goto(productLinks[j].url, { waitUntil: 'networkidle0' }); // Wait for full page load and network stability
      } catch (error) {
        console.error(`Error navigating to product page ${productLinks[j].url}:`, error.message);
        await newProductPage.close();
        continue;
      }

      try {
        await newProductPage.waitForSelector(".product-info", {
          timeout: 2000,
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

    const finalSubCategory = await Promise.all(subCategory.map(element=>translateProduct(element,links[i])))
    console.log(finalSubCategory)
    data[i] = finalSubCategory;
    dataArray.push(finalSubCategory)
    await newPage.close();
  }

  // organise(dataArray)

  // fs.writeFile("input.json", JSON.stringify(data), function (err) {
  //   if (err) throw err;
  //   console.log("complete");
  // });

  try {
    organise(dataArray);  
    await fs.promises.writeFile("input2.json", JSON.stringify(data), 'utf8'); 
    console.log("Data saved successfully.");
  } catch (error) {
    console.error("Error saving data:", error.message);
  }

  browser.close();
  return
}

// scrape()
//  










// organise();
