require("dotenv").config();

const { Client } = require("@notionhq/client");

const notion = new Client({ auth: process.env.NOTION_KEY })
const databaseId = process.env.NOTION_DATABASE_ID
const filePath = process.env.CLIPPING_FILE_PATH || 'My Clippings.txt'


function findPageByTitle(title, allPages) {
    for (let page of allPages) {
        if (page.properties?.Name?.title[0]?.plain_text == title) {
            return page
        }
    }
    return null
}
async function retriveAllPages() {
    const response = await notion.databases.query({
      database_id: databaseId,
    });
    return response.results
}

async function appendHighlights (pageId, highlights) {
    let paragraphs = highlights.map(highlight => ({
        "paragraph": {
            "rich_text": [
              {
                "text": {
                  "content": highlight
                }
              }
            ]
          }
    }))
    const response = await notion.blocks.children.append({
        block_id: pageId,
        children: paragraphs
      });
    console.log('Done Add New Highlight to existing Book')
}

// create page - meaning create a book clippings
async function insertPage ({ title, highlights }) {
    let paragraphsBlocks = highlights.map(highlight => ({
        "object": "block",
        "paragraph": {
            "rich_text": [
                {
                    "text": {
                        "content": highlight,
                    }
                }
            ],
            "color": "default"
        }
    }))
    const response = await notion.pages.create({
        "icon": {
            "type": "emoji",
            "emoji": "🥬"
        },
        "parent": {
            "type": "database_id",
            "database_id": databaseId
        },
        "properties": {
            "Type": {
                "multi_select": [
                    {
                        "id": "afaf2993-9fcb-43a7-adc6-391ed06548c6",
                    }
                ]
            },
            "Name": {
                    // ...NameProperties,
                    "title": [{ "text": { "content": title } }]
            }
        },
        "children": [
            {
                "object": "block",
                "heading_2": {
                    "rich_text": [
                        {
                            "text": {
                                "content": "Highlights"
                            }
                        }
                    ]
                }
            },
            ...paragraphsBlocks
        ]
    })
    console.log('Done Create New Page for Book Highlight')
}


const fs = require('fs')
fs.readFile(filePath, async (err, inputD) => {
    if (err) { throw err }
    if (!inputD.toString()) {
        console.log('No Clippings to upload!')
        return
    }
    let clippingArray = inputD.toString().split('==========')
    clippingArray.pop()
    let groupedClippings = groupByTitle(clippingArray)
    let allPages = await retriveAllPages()
    for (let clipping of groupedClippings) {
        let exist = findPageByTitle(clipping.title, allPages)
        if (exist) { // proceed to insert more highlights
            let pageId = exist.id
            appendHighlights(pageId, clipping.highlights)
        } else {
            insertPage(clipping)
        }
    }
})

function groupByTitle (clippingArray) {
    return clippingArray.reduce((a, b) => {
        let [title, timeLocation, highlight] = b.split(/\r?\n/).filter(item => item)
        let index = a.findIndex(item => item.title === title.trim())
        if (index > -1) {
            a[index].highlights.push(highlight)
        } else {
            a.push({ title: title.trim(), highlights: [highlight] })
        }
        return a
    }, [])
}