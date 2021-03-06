const router = require('express').Router()
const { handleError } = require('../middleware/func.js')
const Item = require('../models/Item.js')
const Activity = require('../models/Activity')
const mongoose = require('mongoose')

router.get('/', async (req, res) => {
    try {
        let items = await Item.find({}).populate('category')
        if (items.length > 0) {res.status(200).json(items)
        }
        else res.status(401).json({message : "Belum ada barang"})
    } catch (error) {
        return res.status(500).json(JSON.stringify(error))
    }
})


router.get('/:id', async (req, res) => {
    try {
        if (mongoose.Types.ObjectId.isValid(req.params.id)) {
            let item = await Item.findOne({_id : req.params.id}).populate('category')
            if (item) {
                return res.status(200).json(item)
            } else {
                return res.status(404).json({message : "Item tidak ditemukan"})
            }
        } else {
            return res.status(404).json({message : `ID tidak valid`})
        }
    } catch (e) {
        res.status(500).json(JSON.stringify(e))
    }
})

router.post('/', async (req, res) => {
    let {name, unit, category, qty, min, max, gap} = req.body
    
    try {
        const newItem = new Item({
            name, unit, category, qty, min, max, gap, status : ""
        })
        
        newItem.calculateStock()
        
        newItem.save((err, doc) => {
            if (err) {
                
                const errors = handleError(err)
                return res.status(400).json({message : "Gagal menambahkan barang" , errors})
            }

            return res.status(200).json({message : "Berhasil menambahkan barang", data  : doc})

        })
    } catch (error) {
        return res.status(500).json(JSON.stringify(error))
    }
})
router.put('/:id', async (req, res) => {
    let {qty, min, max, gap, category, unit, name} = req.body
    try {
        if (mongoose.Types.ObjectId.isValid(req.params.id)) {
            let updateItem = await Item.findOne({_id : req.params.id})
            if (updateItem) {
                updateItem.qty = qty
                updateItem.min = min
                updateItem.max = max
                updateItem.name = name
                updateItem.gap = gap
                updateItem.category = category
                updateItem.unit = unit
                Item.updateOne({_id : req.params.id}, updateItem, {runValidators : false, context : "query", upsert : true}, (err, result) => {
                    if (!err) {
                        if (result.modifiedCount > 0 ) return res.status(200).json({message : 'Berhasil merubah item'})
                        return res.status(401).json({message : 'Tidak ada yang diubah'})
                    } else {
                        let errors = handleError(err)
                        return res.status(400).json({message : "Gagal merubah barang", errors})
                    }
                })
            } else return res.status(404).json({message : 'Barang tidak ditemukan'})

        } else return res.status(404).json({message : 'ID tidak valid'})

    } catch (error) {
        console.log(error)
        return res.status(500).send('something wrong')
    }
})

router.put('/changeStock/:id', async (req, res) => {
    let {type, userId} = req.body
    try {
        if (mongoose.Types.ObjectId.isValid(req.params.id)) {
            
            let updateItem = await Item.findOne({_id : req.params.id})
            if (updateItem) {
                if (JSON.stringify(type) !== "{}") {
                    let {typeOfActivity, value, reason} = type
                    let newActivity = new Activity({
                        userId, 
                        date : Date.now(),
                        do : reason,
                        typeOfActivity,
                        value,
                        itemId : updateItem._id
                    })
                    let qty = typeOfActivity === "increase" ? updateItem.qty + (+value) : updateItem.qty - (+value)
                    updateItem.qty = qty
                    updateItem.calculateStock()
                    await newActivity.save()
                }
                Item.updateOne({_id : req.params.id}, updateItem, {runValidators : false, context : "query", upsert : true}, (err, result) => {
                    if (!err) {
                        if (result.modifiedCount > 0 ) return res.status(200).json({message : 'Berhasil merubah item'})
                        return res.status(400).json({message : 'Tidak ada yang diubah'})
                    } else {
                        let errors = handleError(err)
                        return res.status(400).json({message : "Gagal merubah barang", errors})
                    }
                })
            } else return res.status(404).json({message : 'Barang tidak ditemukan'})

        } else return res.status(404).json({message : 'ID tidak valid'})

    } catch (error) {
        console.log(error)
        return res.status(500).send('something wrong')
    }
})

router.delete('/:id', async (req, res) => {
    try {
        if (mongoose.Types.ObjectId.isValid(req.params.id)) {
            let item = await Item.deleteOne({_id : req.params.id})
            if (item.deletedCount > 0) {
                return res.status(200).json({message : "Barang berhasil dihapus"})
            } else {
                return res.status(401).json({message : "Barang gagal dihapus"})
            }
        } else {
            return res.status(404).json({message : `ID tidak valid`})
        }
    } catch (e) {
        return res.status(500).json(JSON.stringify(e))
    }
})
module.exports = router
