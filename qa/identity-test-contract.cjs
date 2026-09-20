// Stage 7 metadata only. No gameplay field, gear UID or old drone index is hidden.
exports.gameplay=d=>{d=JSON.parse(JSON.stringify(d));delete d.identity027;delete d.saveVersion;d.gameVersion='metadata-only';return d;};
