/*
Welcome to Keystone! This file is what keystone uses to start the app.

It looks at the default export, and expects a Keystone config object.

You can find all the config options in our docs here: https://keystonejs.com/docs/apis/config
*/

require('dotenv').config();
import { config } from '@keystone-6/core';
import { StorageConfig } from '@keystone-6/core/types';

// Look in the schema file for how we define our lists, and how users interact with them through graphql or the Admin UI
import { lists } from './schema';

// Keystone auth is configured separately - check out the basic auth setup we are importing from our auth file.
import { withAuth, session } from './auth';
import { arg } from "@keystone-6/core/dist/declarations/src/types/schema/graphql-ts-schema";

export default withAuth(
  // Using the config function helps typescript guide you to the available options.
  config({
    // the db sets the database provider - we're using sqlite for the fastest startup experience
    db: {
      provider: 'postgresql',
      url: process.env.DATABASE_URL
      
    },
    // This config allows us to set up features of the Admin UI https://keystonejs.com/docs/apis/config#ui
    ui: {
      // For our starter, we check that someone has session data before letting them see the Admin UI.
      isAccessAllowed: (context) => !!context.session?.data,
    },


   
   server: {
     cors: { origin: ['http://localhost:3000', 'http://192.168.235.3:3000' ], credentials: true },
     port: 4000,
     maxFileSize: 200 * 1024 * 1024,
     healthCheck: true,
     extendExpressApp: (app, createContext) => {
      const bodyParser = require('body-parser')
      app.use(bodyParser.json())
      app.post('/api/ping', async (req, res, next) => {
        
        const {counter, sid}= await req.body
        const context = await createContext(req, res);
        const countIncrease = await context.query.Song.updateOne({where:{id:sid}, data:{listenedCount: counter}});
        
       // console.log(countIncrease)
        next();
      })
      app.post('/api/updatedownload', async (req, res, next) => {
        const {downloadCounts, id} = await req.body
        const context  = await createContext(req, res)
        const updateDownload = await context.query.Song.updateOne({where: {id:id}, data:{downloads:downloadCounts}})
        //console.log(downloadCounts, id, updateDownload)
        next()
      })
       
      // app.get('/api/search/:searchData',async (req, res, next) => {
      
      //   const { searchData } = req.params
 
      //   const context = await createContext(req, res)
      //   const getSearchResult = await context.query.Song.findOne({ where: { title: searchData }, query:'title' })
      //   console.log('result ' + JSON.stringify(getSearchResult))

      //   res.send(getSearchResult)
      // // console.log(searchData)
      //  //next()
      // })  

   
    },
   },
   
    storage: {
        files: {
        kind: 'local',
        type: 'file',
        generateUrl: path => `https://adire.pw/wogasp/files${path}`,
        serverRoute: {
          path: 'https://adire.pw/wogasp/files',
        },
        storagePath: 'https://adire.pw/wogasp/files',
      },
  
      images: {
      kind: 'local',
      type: 'image',
      generateUrl: path => `https://adire.pw/wogasp/images${path}`,
      serverRoute: {
        path: 'https://adire.pw/wogasp/images',
      },
      storagePath: 'https://adire.pw/wogasp/images',
    },
  
      profile_images: {
      kind: 'local',
      type: 'image',
      generateUrl: path => `https://adire.pw/wogasp/images/profiles${path}`,
      serverRoute: {
        path: 'https://adire.pw/wogasp/images',
      },
      storagePath: 'https://adire.pw/wogasp/images/profiles',
    },
    },
    
    lists,
    session,
  })
);
