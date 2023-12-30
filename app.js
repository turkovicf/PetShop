const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const path = require('path');
const { error } = require('console');
const session = require('express-session');
const fs = require('fs');
const csv = require('csv-parser');

function citajCSV(){
    let rezultat = [];
    fs.createReadStream('dogs.csv').pipe(csv({})).on('data', (data) => rezultat.push(data)).on('end', () => {
        console.log('Procitan CSV');
        return rezultat;
    })
    
}

const port = 4000;
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: true
}));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

const db = mysql.createConnection({
    host: 'bazepodataka.ba',
    user: 'student2361',
    password: '12602',
    database: 'student2361',
    port: 7306
});

db.connect((err) => {
    if(err){
        console.error('Greska pri povezivanju na bazu!');
        return;
    }
    console.log('Uspjesno povezani na bazu!');
});

app.get('/', (req, res) => {
    try{

        db.query(
            `select s_d.ljubimac_id, kl.ime, v.naziv_vrste, kl.podvrsta, skl.slika from stavke_dokumenta as s_d join dokument as d on s_d.dokument_id = d.dokument_id join kucni_ljubimac as kl on s_d.ljubimac_id = kl.ljubimac_id join vrsta_kucnog_ljubimca as v on kl.vrsta_id = v.vrsta_id join slike_kucnog_ljubimca as skl on skl.ljubimac_id = kl.ljubimac_id group by s_d.ljubimac_id, skl.slika having sum(d.vrsta_dokumenta_id) = 1`, (err, result) =>{
                res.render('index', { lista_ljubimaca : result });
            }
        );
        
    }
    catch(error){
        console.error(error);
    }

});

app.get('/slike/:id', (req, res) => {
    try{
        const id = req.params.id;
        const upit = db.query(
            `select slika from slike_kucnog_ljubimca where ljubimac_id = ${id}`, (err, result) => {
                res.render('galerija', { lista_ljubimaca : result });
            }
        );
        
    }
    catch(error){
        console.error(error);
    }
});

app.get('/lagerlista', (req, res) => {
    try{
        db.query(
            `call lager_lista_2(@x)`, (err, result) => {
                res.render('tabela', { lista : result[0] });
            }
        );
        
    }
    catch(error){
        console.error(error);
    }
});

app.get('/stanjepovrsti', (req, res) => {
    try{
        db.query(
            `call stanje_ljubimaca_po_vrsti()`, (err, result) => {
                res.render('tabela', { lista : result[0] });
            }
        );
        
    }
    catch(error){
        console.error(error);
    }
});

app.get('/stanjeljubimaca', (req, res) => {
    try{
        res.render('forma');
        
    }
    catch(error){
        console.error(error);
    }
});

app.post('/pretrazi/drzava/vrsta', (req, res) => {
    let drzava = req.body.drzava;
    let vrsta = req.body.vrsta;
    
    console.log(vrsta, drzava);
    if(vrsta === '') vrsta = null;
    if(drzava === '') drzava = null;
    try{
        db.query(`call stanje_ljubimaca(?, ?)`, [vrsta, drzava], (err, result) =>{
            console.log(result);
            res.render('tabela', { lista : result[0] });
        });
    }
    catch(error){
        console.error(error);
    }
});

app.get('/vakcinisani', (req, res) => {
    try{
        db.query(`call izvjestaj_vakcinisanih()`, (err, result) =>{
            console.log(result);
            res.render('tabela', { lista : result[0] });
        });
    }
    catch(error){
        console.error(error);
    }
});

app.get('/podaci/:id', (req, res) => {
    const id = req.params.id;
    try{
        db.query(
            `select 
                s_d.ljubimac_id, kl.ime, v.naziv_vrste, kl.podvrsta, kl.datum_nabavke, kl.datum_rodjenja
            from 
                stavke_dokumenta as s_d 
            join 
                dokument as d on s_d.dokument_id = d.dokument_id
            join 
                kucni_ljubimac as kl on s_d.ljubimac_id = kl.ljubimac_id
            join 
                vrsta_kucnog_ljubimca as v on kl.vrsta_id = v.vrsta_id
            group by 
                s_d.ljubimac_id
            having 
                sum(d.vrsta_dokumenta_id) = 1 and s_d.ljubimac_id = ?`,[id], (err, result1) => {
                    db.query(
                        `select 
                            ev.vakcina_id, v.naziv_vakcine, ev.datum_vakcinisanja, ev.datum_vakcinisanja, ev.napomena  
                        from evidencija_vakcinisanja as ev
                        join
                            vakcina as v on ev.vakcina_id = v.vakcina_id
                        where ev.ljubimac_id = ?`,[id], (err, result2) => {
                            res.status(200).json({ podaci : result1[0], vakcinacija : result2[0]});
                        
                    });          
        });
        
    }
    catch(error){
        console.error(error);
    }
});

app.get('/dobavljac/:id', (req, res) => {
    const id = req.params.id;
    try{
        db.query(
            `select dobavljac_id, ime from dobavljac where dobavljac_id = ?`, [id], (err, result) => {
                res.status(200).json(result[0]);
        });
    }
    catch(err){
        console.error(err);
    }
});

app.get('/dobavljac', (req, res) => {
    try{
        db.query(
            `select dobavljac_id, ime from dobavljac`, (err, result) => {
                res.status(200).json(result);
        });
    }
    catch(err){
        console.error(err);
    }
});

app.post('/dobavljac/novi', (req, res) => {
    const id = req.body.dobavljac_id;
    const ime = req.body.ime;
    try{
        db.query(
            `insert into dobavljac(dobavljac_id, ime) values (?, ?)`,[id, ime], (err, result) => {
                if(err){
                    res.status(500).json(`Greska pri unosu`);
                    return;
                }
                res.status(201).json(`Kreiran dobavljac`);
        });
    }
    catch(err){
        console.error(err);
    }
});

app.delete('/dobavljac/:id/izbrisi', (req, res) => {
    const id = req.params.id;
    try{
        db.query(
            `delete from dobavljac where dobavljac_id = ?`,[id], (err, result) => {
                if(err){
                    res.status(500).json(`Greska pri brisanju`);
                    return;
                }
                res.status(200).json(`Izbrisan dobavljac`);
        });
    }
    catch(err){
        console.error(err);
    }
});

app.post('/dobavljac/azuriraj', (req, res) => {
    const id = req.body.dobavljac_id;
    const ime = req.body.ime;
    try{
        db.query(
            `update dobavljac set ime = ? where dobavljac_id = ?`,[ime, id], (err, result) => {
                if(err){
                    res.status(500).json(`Greska pri azuriranju`);
                    return;
                }
                res.status(200).json(`Azuriran uspjesno`);
        });
    }
    catch(err){
        console.error(err);
    }
});

app.get('/dodajcsv', (req, res) => {
    const rez = [];
    fs.createReadStream('dogs.csv').pipe(csv({})).on('data', (data) => rez.push(data)).on('end', () => {
        console.log('Procitan CSV');
        req.session.lista = rez;
        res.render('prikazicsv', { lista: rez });
    });
});

app.post('/dodajcsv', async(req, res) => {
    const lista = req.session.lista;
    let unos_id;
    db.query(
        `select max(ljubimac_id) as unos_id from kucni_ljubimac`, (err, res) => {
            unos_id = res[0].unos_id;
        }
    )

    db.query(
        `select dobavljac_id from dobavljac where ime = ?`, [lista[0].dobavljac], (err, res1) => {
            if(res1.length === 0){
                db.query(`insert into dobavljac(ime) values (?)`, [lista[0].dobavljac, (err, res2) => {
                    console.log('Unio dobavljaca');
                }])
            }
            db.query(
                `select dobavljac_id from dobavljac where ime = ?`, [lista[0].dobavljac], (err, res3) => {
                    db.query(
                        `select count(dokument_id) as rbr from dokument where vrsta_dokumenta_id = 1 and year(datum) = year(current_date)`, (err, res4) => {
                            db.query(
                                `insert into dokument
                                (datum, vrsta_dokumenta_id, broj_dokumenta, status, broj_referentnog_dokumenta, napomena, dobavljac_id)
                                values(?, 1, ?, true, ?, 'Dostava', ?)`, [lista[0].datum_nabavke,'2023/1-' + parseInt(res4[0].rbr + 1, 10), lista[0].broj_referentnog_dokumenta, res3[0].dobavljac_id], (err, res5) => {
                                    console.log('Unio dokument', res5, err);
                                    db.query(
                                        `select dokument_id from dokument order by dokument_id DESC limit 1`, (err, res6) => {
                                            console.log(`evo me ovdje 1`);
                                            console.log(res6[0]);
                                            for(let i = 0; i < lista.length; i++){
                                                console.log(`evo me ovdje 2`);
                                                db.query(
                                                    `select vrsta_id from vrsta_kucnog_ljubimca where naziv_vrste = ?`,[lista[i].vrsta], (err, res7) => {
                                                        console.log('oeee', res7,err);
                                                        if(res7.length === 0){
                                                            db.query(`insert into vrsta_kucnog_ljubimca(naziv_vrste) values (?)`, [lista[i].vrsta], (err, res8) => {
                                                                console.log(`Unio vrstu`,err);
                                                            })
                                                        }
                                                        db.query(`
                                                            select vrsta_id from vrsta_kucnog_ljubimca where naziv_vrste = ?`,
                                                            [lista[i].vrsta], (err, res8) => {
                                                                db.query(
                                                                    `select drzava_id from drzava where naziv_drzave = ?`, [lista[i].drzava], (err, res9) => {
                                                                        if(res9.length === 0){
                                                                            db.query(`insert into drzava(naziv_drzave) values (?)`,
                                                                            [lista[i].drzava], (err, res10) => {
                                                                                console.log('Unio drzavu');
                                                                            })
                                                                        }
                                                                        db.query(
                                                                            `select drzava_id from drzava where naziv_drzave = ?`, [lista[i].drzava], (err, res11) => {
                                                                                console.log('Unosim ljubimce');
                                                                                //console.log(res12[i].unos_ljubimac_id);
                                                                            
                                                                                db.query(`insert into kucni_ljubimac(ime, vrsta_id, podvrsta, datum_nabavke, datum_rodjenja, drzava_id) values(?, ?, ?, ?, ?, ?)`,
                                                                                [lista[i].ime, res8[0].vrsta_id, lista[i].podvrsta, lista[i].datum_nabavke, lista[i].datum_rodjenja, res11[0].drzava_id], (err, res12) => {
                                                                                    if(err) console.log(err);
                                                                
                                                                                        
                                                                                        db.query(
                                                                                            `SELECT MAX(ljubimac_id) FROM kucni_ljubimac
                                                                                            `, (err, res13) => {
                                                                                
                                                                                                let ljubimac_id = parseInt(unos_id + i + 1, 10);
                                                                                                let dokument_id = parseInt(res6[0].dokument_id);
                                                                                                db.query(
                                                                                                    `insert into stavke_dokumenta(dokument_id, ljubimac_id, cijena, vrijednost, pdv) values(
                                                                                                        ?, ?, ?, ?, ?
                                                                                                    )`, [dokument_id, ljubimac_id, lista[i].cijena, lista[i].cijena/1.17, (lista[i].cijena/1.17)*0.17], (err, result7) => {
                                                                                                        if(err) console.log(err);
                                                                                                        else console.log('Unio stavke');
                                                                                                        db.query(
                                                                                                            `insert into slike_kucnog_ljubimca(ljubimac_id,slika,je_defaultna) values(?, ?, true)`, [ljubimac_id, lista[i].photo], (err, res13) => {
                                                                                                                if(err) console.log(err);
                                                                                                                else console.log('Unios slike');
                                                                                                            }
                                                                                                        )
                                                                                                    }
                                                                                                )
                                                                                            }
                                                                                        )
                                                                                })
                                                                        }
                                                                    )
                                                                })
                                                            })
                                                    }
                                                )
                                            }
                                        }
                                    )
                                }
                            )
                        }
                    )

                }
            )
        }
    )
    res.status(200).json(lista);
});

app.post('/dodajcsv1', (req, res) => {
    const lista = req.session.lista;

    console.log(lista[0]);
    let dobavljac = lista[0].dobavljac;
    let broj_ref_dok = lista[0].broj_referentnog_dokumenta;

    db.query(
        `select dobavljac_id as id from dobavljac where ime = ?`,[dobavljac], (err, result1) => {
            console.log(result1[0]);
            if(result1[0].length === 0){
                db.query(`insert into dobavljac(ime) values (?)`, [dobavljac], (err, result2) => {
                    console.log('Unio dobavljaca');
                });
            }
        }
    );
    
    let unos_dokument_id;
    db.query(
        `select dobavljac_id as id from dobavljac where ime = ?`,[dobavljac], (err, result1) => {
            let unos_dobavljac = result1[0].dobavljac_id;
            db.query(
                `select count(dokument_id) as rbr from dokument where vrsta_dokumenta_id = 1 and year(datum) = year(current_date)`,
                (err, result2) => {
                    let redni_broj_dokumenta = '2023/1' + result2[0].rbr;
                    db.query(
                        `insert into dokument
                        (datum, vrsta_dokumenta_id, broj_dokumenta, status, broj_referentnog_dokumenta, napomena, dobavljac_id)
                        values(?, 1, ?, true, ?, 'Dostava', ?)`, [lista[0].datum_nabavke, redni_broj_dokumenta, lista[0].broj_referentnog_dokumenta, unos_dobavljac], (err, result3) => {
                            console.log('Unio dokument', result3);
                            db.query(`
                                select dokument_id from dokument order by dokument_id DESC limit 1;`, (err, result4) => {
                                    unos_dokument_id = result4[0] + 1;
                                    console.log(unos_dokument_id);
                                    console.log('evo me ovdje');
                            });
                        }
                    )
                }
            )
        }
    );
    
    for(let i = 0; i < lista.length; i++){
        let unos_ljubimac_id;
        db.query(
            `select vrsta_id from vrsta_kucnog_ljubimca where naziv_vrste = ?`,[lista[i].vrsta], (err, result1) => {
                console.log('rez1', result1);
                if(result1[0].length === 0){
                    db.query(`insert into vrsta_kucnog_ljubimca(naziv_vrste) values (?)`, [lista[i].vrsta], (err, result2) => {
                        console.log('Unio novu vrstu');
                    });
                }
            
                db.query(
                    `select vrsta_id from vrsta_kucnog_ljubimca where naziv_vrste = ?`,[lista[i].vrsta], (err, result2) => {
                        let unos_vrsta_id = result2[0].vrsta_id;
                        console.log('rez2',result2[0]);
                        db.query(
                            `select drzava_id from drzava where naziv_drzave = ?`, [lista[i].drzava], (err, result3) => {
                                console.log('rez3',result3);
                                if(result3[0].length === 0){
                                    db.query(`insert into drzava(naziv_drzave) values (?)`, [lista[i].drzava], (err, result4) => {
                                        console.log('Unio drzavu');
                                    })
                                }

                                db.query(`select drzava_id from drzava where naziv_drzave = ?`, [lista[i].drzava], (err, result4) => {
                                    console.log('rez4',result4);
                                    let unos_drzava_id = result4[0].drzava_id;
                                    db.query(`insert into kucni_ljubimac(ime, vrsta_id, podvrsta, datum_nabavke, datum_rodjenja, drzava_id) values(?, ?, ?, ?, ?, ?)`,
                                    [lista[i].ime, unos_vrsta_id, lista[i].podvrsta, lista[i].datum_nabavke, lista[i].datum_rodjenja, unos_drzava_id], (err, result5) => {
                                        db.query(
                                            `select ljubimac_id from kucni_ljubimac order by ljubimac_id desc`, (err, result6) => {
                                                let unos_ljubimac_id = result6[0].ljubimac_id;
                                                db.query(
                                                    `insert into stavke_dokumenta(dokument_id, ljubimac_id, cijena, vrijednost, pdv) values(
                                                        ?, ?, ?, ?, ?
                                                    )`, [unos_dokument_id, unos_ljubimac_id, lista[i].cijena, lista[i].cijena/1.17, (lista[i].cijena/1.17)*0.17], (err, result7) => {
                                                        'Unio sve valjda'
                                                    }
                                                )
                                            }
                                        )
                                    })
                                })
                            }
                        )
                });
            }
        )
    }


    res.send('Uspjesno dodali CSV u bazu');
});

app.listen(port, (err) => {
    if(err) console.error('Greska:',err);
    else console.log(`Server is listening on port ${port}...`);
});

module.exports = app;