import DataURIparser from 'datauri/parser.js';
import path from 'path';

const getdatauri = (file) => {
    if(!file || !file.originalname || !file.buffer){
        throw new Error('Invalid file');
    } 
    const parser = new DataURIparser();
    const extName = path.extname(file.originalname).toString();
    return parser.format(extName, file.buffer);
}

export default getdatauri;