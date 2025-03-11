import puppeteer from 'puppeteer';

const typeMap = {
	ccp: 16,
	cca: 5,
	16: 'ccp',
	5: 'cca',
};

const buildURL = ({ currentPage = 1, pageSize = 100, typeId = 5 }) => (
	`https://cyberab.org/Catalog#!/c/s/Results/Format/list/Page/${currentPage}/Size/${pageSize}/Sort/NameAscending?attributesAll=%5ECountriesSupported%7C1&typeId=${typeId}`
);

const scrapeData = async (typeId) => {
	const url = buildURL({ typeId });

	const browser = await puppeteer.launch({ headless: true });
	const page = await browser.newPage();

	await page.goto(url, {
		waitUntil: 'networkidle2',
	});

	const names = await page.evaluate(() => {
		return [...document.querySelectorAll('.store-title span')]
			.map(el => el.textContent.trim());
	});

	const addresses = await page.evaluate(() => {
		const addressArray = [];

		document.querySelectorAll('tr.ng-scope').forEach((row) => {
			const addressText = row.querySelector('td:nth-child(2) span');
			if (addressText) {
				addressArray.push(addressText.textContent.trim());
			}
		});

		return addressArray;
	});

	const result = names.map((name, index) => {
		const obj = { name, role: typeMap[typeId] };

		const associatedAddresses = addresses.slice(index * 3, (index + 1) * 3);
		if (associatedAddresses.length > 0) {
			obj.address = associatedAddresses.join(", ");
		}

		return obj;
	});

	await browser.close();
	return result;
};

const crawl = async () => {
	// add intervals
	// allow for multiple ecosystem roles
	const data = await scrapeData(typeMap.ccp);
	console.dir(data, { depth: null, colors: true })
}

crawl();

