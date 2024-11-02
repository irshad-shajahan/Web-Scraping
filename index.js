import puppeteer from "puppeteer";
import fs from "fs";
import { Parser } from "json2csv";
import translate from "@iamtraction/google-translate";
import { makuta } from "./links.js";

const baseUrl = "https://oscotools.com/";
const links = makuta  

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
      productCategoryId: elem.catId,
      productPrice:element.offerPrice,
      productBrandId:elem.brandId
      // productMrp:element.actualPrice
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
      await newPage.goto(`${links[i].url}?products-per-page=all`, { waitUntil: 'networkidle0' }); // Wait for full page load and network stability
    } catch (error) {
      console.error(`Error navigating to ${links[i].url}:`, error.message);
      await newPage.close();
      continue;
    }

    try {
      await newPage.waitForSelector(".product-inner", { timeout: 10000 });
    } catch (error) {
      console.log(
        `Selector .product-layout not found on page: ${links[i].url}`
      );
      await newPage.close();
      continue;
    }

    const productLinks = await newPage.$$eval(".product-inner", (products) => {
      if (products.length > 0) {
        return products.map((e) => ({
          url: e.querySelector(".woocommerce-LoopProduct-link").getAttribute("href") || "",
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
        await newProductPage.waitForSelector(".type-product", {
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
        const titleElement = document.querySelector(".product_title");
        const priceElement = document.querySelector(".price");
        // const priceElement2 = document.querySelector(
        //   ".booknow1 > span > span:nth-child(1)"
        // );
        let offerPrice = "";
        if (priceElement) {
         offerPrice = priceElement.textContent.split("ر.س")[0].split(".")[0];
        }

        const descriptionElements =
          document.querySelectorAll(".woocommerce-product-details__short-description p");
        let description = "";
        descriptionElements.forEach((p, index) => {
          description += p.innerText;
          if (index < descriptionElements.length - 1) {
            description += "<br>";
          }
        });
        return {
          name: titleElement ? titleElement.innerText : "",
          // actualPrice: priceElement ? priceElement2.innerText : "",
          offerPrice:offerPrice,
          description: description,
        };
      });
      subCategory.push(productDetail);
      await newProductPage.close();
      console.log(productDetail)
    }

    const finalSubCategory = await Promise.all(subCategory.map(element=>translateProduct(element,links[i])))
    console.log(finalSubCategory)
    data[i] = finalSubCategory;
    dataArray.push(finalSubCategory)
    await newPage.close();
    console.log(finalSubCategory)
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

scrape()
