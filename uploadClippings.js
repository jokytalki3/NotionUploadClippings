require("dotenv").config();

const { Client } = require("@notionhq/client");

const notion = new Client({ auth: process.env.NOTION_KEY })
const databaseId = process.env.NOTION_DATABASE_ID
const filePath = process.env.CLIPPING_FILE_PATH || 'My Clippings.txt'

const fs = require('fs')
fs.readFile(filePath, async (err, inputD) => {
    let allPages = await retriveAllPages()
    if (err) { throw err }
    if (!inputD.toString()) {
        console.log('No Clippings to upload!')
        return
    }
    let clippingArray = inputD.toString().split('==========')
    clippingArray.pop()
    for (let clipping of clippingArray) {
        let [title, timeLocation, highlight] = clipping.split(/\r?\n/).filter(item => item)
        let exist = await findPageByTitle(title, allPages)
        if (exist) { // proceed to insert more highlights
            let pageId = exist.id
            appendHighlights(pageId, highlight)
            continue
        }
        // proceed to create
        insertPage(title, highlight)
    }
})


function findPageByTitle(title, allPages) {
    for (let page of allPages) {
        if (page.properties?.Name?.title[0]?.text.content === title) {
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

async function appendHighlights (pageId, highlight) {
    const response = await notion.blocks.children.append({
        block_id: pageId,
        children: [
          {
            "paragraph": {
              "rich_text": [
                {
                  "text": {
                    "content": highlight
                  }
                }
              ]
            }
          }
        ],
      });
    console.log('Done Add New Highlight to existing Book')
}

// create page - meaning create a book clippings
async function insertPage (title, highlight) {
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
            {
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
            }
        ]
    })
    console.log('Done Create New Page for Book Highlight')
}