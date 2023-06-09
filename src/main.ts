import { Actor } from 'apify';
import { CheerioCrawler, Dataset } from 'crawlee'
import * as htmlparser from 'htmlparser2'

await Actor.main(async () => {
    const crawler = new CheerioCrawler({
        async requestHandler({ $, request, enqueueLinks }) {
            const html = $('html').html() || ''
            const title = $('title').text()
            console.log(`Crawling ${title} at "${request.url}".`)

            // Parse all parts of the DOM
            let parts:any = []
            let parser = new htmlparser.Parser({
                onopentag: function () { parts.push(' ') },
                ontext: function (text) { parts.push(text) },
                onclosetag: function () { parts.push(' ') }
            },{ decodeEntities: true })
            parser.write(html)
            parser.end()
            
            // Clean up page content
            // Join the parts and replace all occurrences of 2 or more spaces with a single space.
            let content = parts.join(' ').replace(/\ {2,}/g, ' ')

            // Setup a regex for finding rates
            const regex = /\d+\.\d+%/g // Decimal and % required.

            // Find rates in the content
            let rates = []
            let matches = content.match(regex)
            if (matches) rates.push(...matches)

            // Store rates
            await Dataset.pushData({
                url: request.loadedUrl,
                title,
                rates,
            })

            // Add other found links to queue
            await enqueueLinks({
                strategy: 'same-domain',
                transformRequestFunction(req) {
                    if (req.url.endsWith('.pdf')) return false // ignore all links ending with `.pdf`
                    return req
                },
            })
        }
    })

    // Get actor inputs (from Apify console)
    const input: any = await Actor.getInput()
    const { startUrls } = input

    // Run crawler
    await crawler.run(startUrls)
});
