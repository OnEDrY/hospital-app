const sql = require("./db.js");

class Doctor {

    static async getById(id) {
        if (!id) throw "Id not specified!";

        let rows = await sql.query("SELECT * FROM doctors WHERE userid = ?", id);
        return rows[0];
    }

    static async getByDoctorId(id) {
        if (!id) throw "Id not specified!";

        let rows = await sql.query("SELECT * FROM doctors WHERE doctorid = ?", id);
        return rows[0];
    }

    static async getAllDoctors() {
        let rows = await sql.query("SELECT * FROM doctors");
        
        return rows;
    }

    static async updateDoctor(doctor) {
        await sql.query("UPDATE doctors SET ? WHERE doctorid = ?", [doctor, doctor.doctorid]);
    }

    static async getTestsByDoctor(doctorid) {
        let rows = await sql.query("SELECT * FROM tests WHERE doctorid = ?", doctorid);
        return rows;
    }

    static async getTestsByPatient(patientId) {
        let rows = await sql.query("SELECT * FROM tests WHERE patientid = ?", patientId);
        return rows;
    }

    static async create(doctor) {
        let rows = await sql.query("INSERT INTO doctors SET ?", doctor);
        return rows;
    }
}

module.exports = Doctor;