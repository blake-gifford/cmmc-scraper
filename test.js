import puppeteer from 'puppeteer';
import fs from 'fs';
// import { parse } from 'json2csv';

const typeMap = {
    ccp: 16,
    cca: 5,
    16: 'ccp',
    5: 'cca',
};

const buildURL = ({ currentPage = 1, pageSize = 500, typeId = 5 }) => (
    `https://cyberab.org/Catalog#!/c/s/Results/Format/list/Page/${currentPage}/Size/${pageSize}/Sort/NameAscending?attributesAll=%5ECountriesSupported%7C1&typeId=${typeId}`
);

const scrapeData = async (typeId) => {
    const url = buildURL({ typeId });
    console.log(`Accessing URL: ${url}`); // Debug URL

    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    await page.goto(url, { waitUntil: 'networkidle2' });

    const names = await page.evaluate(() => {
        const elements = document.querySelectorAll('.store-title span');
        if (elements.length === 0) {
            console.error("No elements matched by '.store-title span'.");
        }
        return Array.from(elements).map(el => el.textContent.trim());
    });

    const addresses = await page.evaluate(() => {
        const rows = document.querySelectorAll('tr.ng-scope');
        if (rows.length === 0) {
            console.error("No rows matched by 'tr.ng-scope'.");
        }
        return Array.from(rows).map(row => {
            const addressText = row.querySelector('td:nth-child(2) span');
            return addressText ? addressText.textContent.trim() : null;
        }).filter(address => address != null);
    });

    console.log(`Found ${names.length} names and ${addresses.length} addresses`); // Debug extracted data

    const result = names.map((name, index) => {
        return {
            name,
            role: typeMap[typeId],
            address: addresses.length > index ? addresses[index] : 'No address provided'
        };
    });

    await browser.close();
    return result;
};

const writeToCSV = async (data, filename) => {
    if (data.length === 0) {
        console.log(`No data to write for ${filename}.`);
        return;
    }
    const columns = ['name', 'role', 'address'];
    try {
        console.log('csv data: ', data)
        const csv = Papa.unparse(data, { columns })
        // const csv = parse(data, opts);
        fs.writeFileSync(filename, csv);
        console.log(`Data has been written to CSV file successfully in ${filename}.`);
    } catch (err) {
        console.error('Error writing CSV file', err);
    }
};

const crawl = async () => {
    for (const key in typeMap) {
        if (!isNaN(typeMap[key])) { // Ensure that the key is numeric
            const data = await scrapeData(typeMap[key]);
            const filename = `output_${typeMap[typeMap[key]]}.csv`; // Naming file based on role
            await writeToCSV(data, filename);
        }
    }
};

crawl();