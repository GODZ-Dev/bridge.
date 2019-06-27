import TabSystem from "../TabSystem";
import Provider from "../autoCompletions/Provider";
import fs from "fs";
import { readJSON } from "../utilities/JsonFS";
let FILE_DEFS;
let HIGHLIGHTER_CACHE = {};
let FILE_CREATOR_CACHE = [];

export default class FileType {
    static reset() {
        FILE_DEFS = undefined;
        FILE_CREATOR_CACHE = [];
    }

    //Special method to e.g. avoid "loot_tables/blocks/something.json" being considered a "block"
    static pathIncludes(path, includes) {
        try {
            path = path.split(/development_behavior_packs|development_resource_pack/g)[1].split(/\\|\//g);
            path.shift();
            path.shift();
            path = path.join("/");

            return path.startsWith(includes);
        } catch(e) {
            // console.log(path, includes,path.includes(includes));
            return path.includes(includes);
        }
    }
    //Load files which aren't in a "development_behavior_packs" folder correctly
    static fallbackToBP(path) {
        return path.split(/development_behavior_packs|development_resource_pack/g)[1] === undefined;
    }

    static get(file_path) {
        let data = this.getData(file_path);
        if(data === undefined) return "unknown";
        return data.id;
    }

    static getData(file_path) {
        if(FILE_DEFS === undefined) FILE_DEFS = Provider.FILE_DEFS;
        let path = file_path;
        
        if(path === undefined) {
            try {
                path = TabSystem.getSelected().file_path;
            } catch(e) { return; }
        }

        
        
        for(let def of FILE_DEFS) {
            // console.log(path);
            if(this.pathIncludes(path, def.includes) && (path.includes("development_behavior_packs") || def.rp_definition || this.fallbackToBP(path)))
                return def;
        }
        return;
    }

    static getAll() {
        if(FILE_DEFS === undefined) FILE_DEFS = Provider.FILE_DEFS;
        return FILE_DEFS.map(def => def.id);
    }
    static getAllData() {
        if(FILE_DEFS === undefined) FILE_DEFS = Provider.FILE_DEFS;
        return FILE_DEFS;
    }

    static getFileCreator() {
        if(FILE_DEFS === undefined) FILE_DEFS = Provider.FILE_DEFS;
        if(FILE_CREATOR_CACHE.length === 0) {
            FILE_CREATOR_CACHE = FILE_DEFS.reduce((acc, file) => {
                if(file.file_creator !== undefined) {
                    if(typeof file.file_creator === "string")
                        acc.push({
                            rp_definition: file.rp_definition,
                            ...JSON.parse(fs.readFileSync(`${__static}\\file_creator\\${file.file_creator}.json`).toString())
                        });
                    else
                        acc.push({
                            rp_definition: file.rp_definition,
                            ...file.file_creator
                        });
                }
                return acc;
            }, []);
        }
        return FILE_CREATOR_CACHE;
    }

    static getHighlighter() {
        try {
            let hl = this.getData().highlighter;
            if(typeof hl === "object")
                return hl;
            if(HIGHLIGHTER_CACHE[hl] === undefined)
                HIGHLIGHTER_CACHE[hl] = JSON.parse(fs.readFileSync(`${__static}\\highlighter\\${hl}.json`).toString());
            return HIGHLIGHTER_CACHE[hl];
        } catch(e) {
            console.log(e)
            return {
                define: {
                    keywords: [],
                    symbols: [],
                    titles: []
                }
            };
        }
    }

    static DefaultBuildArrays(file_path) {
        try {
            return this.getData(file_path).default_build_arrays;
        } catch(e) {
            return false;
        }
    }

    static getDocumentation() {
        return this.getData().documentation;
    }

    static async getSnippets() {
        let file_types = this.getAllData();
        let snippets = {};
        let proms = [];

        for(let type of file_types) {
            if(type.snippets !== undefined) {
                proms.push(readJSON(`${__static}\\snippets\\${type.snippets}.json`).then(data => snippets[type.id] = data));
            }
        }

        await Promise.all(proms);
        return snippets;
    }
}