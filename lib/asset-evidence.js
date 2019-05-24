var { AssetBase } = require('ddn-asset-base');

class AssetEvidence extends AssetBase
{

    async propsMapping() {
        return [
            {field: "str4", prop: "ipid", required: true, maxLen: 64},
            {field: "str6", prop: "title", required: true, maxLen: 128},
            {field: "str8", prop: "description"},
            {field: "str7", prop: "hash", required: true, maxLen: 128},
            {field: "str5", prop: "tags"},
            {field: "str3", prop: "author", required: true, maxLen: 20},
            {field: "str9", prop: "url", required: true, maxLen: 256},
            {field: "str1", prop: "type", required: true},
            {field: "str2", prop: "size"}
        ];
    }

    async verify(trs, sender)
    {
        const trans = await super.verify(trs, sender);
        const assetObj = await this.getAssetObject(trs);
        
        const results = await super.queryAsset({
            ipid: assetObj.ipid
        }, ["ipid"], false, 1, 1);
        if (results && results.length > 0) {
            const oldEvidence = results[0];
            return await new Promise((resolve, reject) => {
                this.dao.findOneByPrimaryKey("tr", oldEvidence.transaction_id, 
                ["sender_id"], async (err, result) => {
                    if (err) {
                        reject(err);
                    } else {
                        if (result.sender_id != sender.address) {
                            return reject('The evidence ipid ' + assetObj.ipid + ' has been registered by ' + result.sender_id);
                        } else {
                            var results2;
                            try
                            {
                                results2 = await super.queryAsset({
                                    ipid: assetObj.ipid,
                                    hash: assetObj.hash
                                }, ["ipid", "hash"], false, 1, 1);
                            }
                            catch (err2)
                            {
                                return reject(err2);
                            }

                            if (results2 && results2.length > 0) {
                                return reject('The evidence hash already exists: ' + assetObj.hash);
                            } else {
                                resolve(trans);
                            }
                        }
                    }
                });
            })
        } else {
            return trans;
        }
    }

    async applyUnconfirmed(trs, sender, dbTrans) {
        const assetObj = await this.getAssetObject(trs);
        const key = `${sender.address}:${trs.type}:${assetObj.ipid}`;
        if (this.oneoff.has(key)) {
            throw new Error(`The evidence ${assetObj.ipid} is in process already.`);
        }

        await super.applyUnconfirmed(trs, sender, dbTrans);

        this.oneoff.set(key, true);
    }

    async undoUnconfirmed(trs, sender, dbTrans) {
        const assetObj = await this.getAssetObject(trs);
        const key = `${sender.address}:${trs.type}:${assetObj.ipid}`;
        this.oneoff.delete(key);

        var result = await super.undoUnconfirmed(trs, sender, dbTrans);
        return result;
    }

}

module.exports = AssetEvidence;