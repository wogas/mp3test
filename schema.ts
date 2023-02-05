/*
Welcome to the schema! The schema is the heart of Keystone.

Here we define our 'lists', which will then be used both for the GraphQL
API definition, our database tables, and our Admin UI layout.

Some quick definitions to help out:
A list: A definition of a collection of fields with a name. For the starter
  we have `User`, `Post`, and `Tag` lists.
A field: The individual bits of data on your list, each with its own type.
  you can see some of the lists in what we use below.

*/

// Like the `config` function we use in keystone.ts, we use functions
// for putting in our config so we get useful errors. With typescript,
// we get these even before code runs.
import { config, list } from "@keystone-6/core";
 //import * as sharp from "sharp";
// import * as mp3tag from 'mp3tag';



// We're using some common fields in the starter. Check out https://keystonejs.com/docs/apis/fields#fields-api
// for the full list of fields.
import {
  text,
  relationship,
  password,
  timestamp,
  select,
  file,
  image,
  json,
  integer,
} from "@keystone-6/core/fields";
// The document field is a more complicated field, so it's in its own package
// Keystone aims to have all the base field types, but you can make your own
// custom ones.
import { document } from "@keystone-6/fields-document";

// We are using Typescript, and we want our types experience to be as strict as it can be.
// By providing the Keystone generated `Lists` type to our lists object, we refine
// our types to a stricter subset that is type-aware of other lists in our schema
// that Typescript cannot easily infer.
import { Lists } from ".keystone/types";

import type { KeystoneContext } from "@keystone-6/core/types";
import { session } from "./auth";
import {
  createNoSubstitutionTemplateLiteral,
  isAssertClause,
  isAsteriskToken,
  setCommentRange,
  setOriginalNode,
} from "typescript";

// We have a users list, a blogs list, and tags for blog posts, so they can be filtered.
// Each property on the exported object will become the name of a list (a.k.a. the `listKey`),
// with the value being the definition of the list, including the fields.
export const lists: Lists = {
  // Here we define the user list.
  User: list({
    // Here are the fields that `User` will have. We want an email and password so they can log in
    // a name so we can refer to them, and a way to connect users to posts.
    fields: {
      name: text({ validation: { isRequired: true } }),
      email: text({
        validation: { isRequired: true },
        isIndexed: "unique",
        isFilterable: true,
      }),
      // The password field takes care of hiding details and hashing values
      password: password({ validation: { isRequired: true } }),
   
    },
    // Here we can configure the Admin UI. We want to show a user's name and posts in the Admin UI
    ui: {
      listView: {
        initialColumns: ["name"],
      },
    },
  }),
 

  //custom lists start here
  // the artists list
  Artist: list({
    fields: {
      name: text({ validation: { isRequired: true }, isIndexed: "unique" }),
      about:  document({
        formatting: true,
        layouts: [
          [1, 1],
          [1, 1, 1],
          [2, 1],
          [1, 2],
          [1, 2, 1],
        ],
        links: true,
        dividers: true,
      }),
      birthname: text(),
      genre: text(),
      dob: text(),
      recordLabel: text(),
      avater: image({storage:'profile_images'}),
      songs: relationship({ ref: "Song.artist", many: true }),
      album: relationship({ ref: "Album.artist", many: true }),
    },
    hooks: {
      resolveInput: async ({ resolvedData }) => {
        const  avater  = resolvedData.avater;
        //update image file
        if (avater?.id !== undefined) {
          const oldImage =  `public/images/profiles/${avater.id}.${avater.extension}`
          const sharp = require('sharp')
          const modifiedImage = await sharp(
            oldImage
            )
            
            .resize(200, 200)
            .webp({ lossless: true })
            .toFile(
              `public/images/profiles/${avater.id}.webp`,
              (err, info) => {
                if (info) {
                  const fs = require("fs");
                  if (fs.existsSync( oldImage)) {
                    try {
                      fs.unlinkSync(oldImage);
                      console.log("old image file removed");
                    } catch (err) {
                      console.error(err);
                    }
                  }
                }
              }
            );

          return {
            ...resolvedData,
            avater: {
              id: avater.id,
              filesize: modifiedImage?.options.filesize || avater.filesize,
              width: modifiedImage.options.width,
              height: modifiedImage.options.height,
              extension: modifiedImage?.options.formatOut || avater?.extension,
            },
          
          }
        
        }
        // We always return resolvedData from the resolveInput hook
        return resolvedData;
      },
    }
  }),
  Song: list({
    fields: {
      title: text({ validation: { isRequired: true }, isIndexed: "unique" }),
      description: text(),
      genre: text(),
      listenedCount: integer({defaultValue:0}),
      downloads: integer({ defaultValue: 0 }),
      tags: text(),
      songUrl: file({storage:'files'}),
      songAvater: image({storage:'images'}),
      featuring: json({ defaultValue: { features: {"artist_name": false}} }),
      album: relationship({ ref: "Album.song", many: true }),
      artist: relationship({ ref: "Artist.songs", many: true }),
      comment: relationship({ref: "Comment.song", many:true}),
      lyrics: document({
        formatting: true,
        layouts: [
          [1, 1],
          [1, 1, 1],
          [2, 1],
          [1, 2],
          [1, 2, 1],
        ],
        links: true,
        dividers: true,
        
      }),
      createdAt: timestamp({defaultValue:{kind:"now"},db:{updatedAt: true}})
    },
    hooks: {
     
      resolveInput: async ({ resolvedData, context, operation }) => {
        const { songAvater, songUrl, title, artist, album , genre,featuring} = resolvedData;

         let artistName:any 
         let dbAlbum:any
        if(operation === "update"){
           artistName = artist
           dbAlbum = album
        }else{
         artistName  = await context.db.Artist?.findOne({
          where: { id: artist?.connect[0].id },
        })
         dbAlbum  =  await context.db.Album?.findOne({
          where: {id: album?.connect[0].id}
        })
      } 
      

        if (songUrl?.filename !== undefined) {
          const oldMusicFile = songUrl.filename
  
          // update song id3 tags
          const NodeID3 = require('node-id3')
          const filebuffer = Buffer.from(songUrl.filename)
          //const filebuffer = songUrl
          const filepath = 'public/files/' + songUrl.filename
          let songFeature = ''
          let newFile = `${title}-by-${artistName.name}-Kidaaa-com.mp3`;
          if(featuring?.features.artist_name ){
            songFeature = '-ft-' + featuring?.features.artist_name 
             newFile = `${title}-by-${artistName.name}${songFeature}-Kidaaa-com.mp3`;
          } else{ 
            songFeature = ''
            
          } 
            const tags = {
              title: title + " || Kidaaa.com",
              artist: artistName.name + songFeature,
              album: dbAlbum.title,
              APIC: "public/generalCover/kidaaa.png",
              comment: {
                language: 'eng',
                text: 'From the possession of Kidaaa.com'
              },
              genre: genre
              
            }
            const success = NodeID3.write(tags, filepath) 
            if(success === true){
              console.log(tags)
            }
            const bufferSuccess = NodeID3.write(tags, filebuffer) // Returns Buffer
         
              const fs = require("fs");
              if (fs.existsSync("public/files/" + oldMusicFile)) {
                try {
                  fs.linkSync('public/files/'+oldMusicFile, 'public/files/'+ newFile)
                  fs.unlinkSync("public/files/" + oldMusicFile);
                  
                  console.log("old file removed");
                } catch (err) {
                  console.error(err);
                }
              }
            
        
            
          return {
            ...resolvedData,
            songUrl: {
       
              filesize: songUrl.filesize,
              filename: newFile,
            },
          };
        }

        //update image file
       // console.log('image : ' + JSON.stringify(songAvater))
       
        if (songAvater?.id !== undefined) {
          const oldImage =  `public/images/${songAvater.id}.${songAvater.extension}`
          const sharp = require('sharp')
          const modifiedImage = sharp(oldImage)
            
            .resize(200, 200)
            //.webp()
            .toFile(
              `public/images/${songAvater.id}.webp`,
              (err, info) => {
                if (info) {
                  const fs = require("fs");
                  if (fs.existsSync( oldImage)) {
                    try {
                      fs.unlinkSync(oldImage);
                      console.log("old image file removed");
                    } catch (err) {
                      console.error(err);
                    }
                  }
                }
              }
            );
            // console.log('real : ' + JSON.stringify(songAvater))
            // console.log('workedon: ' +JSON.stringify(modifiedImage._readableState.highWaterMark))

          return {
            ...resolvedData,
            songAvater: {
              id: songAvater.id,
              //filesize: modifiedImage.options.filesize,
              filesize:modifiedImage._readableState.highWaterMark,
              width: modifiedImage.options.width,
              height: modifiedImage.options.height,
              //extension: modifiedImage.options.formatOut,
              extension: 'webp'
            },
          
          }
        
        }
        // We always return resolvedData from the resolveInput hook
        return resolvedData;
      },
    },
  }),
  Album: list({
    fields: {
      title: text({ validation: { isRequired: true }, isIndexed: "unique" }),
      about: text(),
      featuring: json({ defaultValue: { features: false, moreInfo: false } }),
      artist: relationship({ ref: "Artist.album", many: true }),
      song: relationship({ ref: "Song.album", many: true }),
    },
  }),
  // Commenter: list({
  //   fields: {
  //     name: text({ validation: { isRequired: true } }),
  //     email: text({ validation: { isRequired: true }, isIndexed: "unique" }),
  //     comment: relationship({ref: "Comment.commenter", many: true})
  //   }
  // }),
  Comment: list({
    fields: {
      name: text({ validation: { isRequired: true } }),
      email: text({ validation: { isRequired: true }, isIndexed: "unique" }),
      content: text(),
      reply: relationship({ ref: "Reply.comment", many:true}),
      song: relationship({ref: "Song.comment", many:true})
    }
  }),
  Reply: list({
    fields: {
      name: text({ validation: { isRequired: true } }),
      content: text(),
      comment: relationship({ref: "Comment.reply", many:true})
      
    }
  })
};

