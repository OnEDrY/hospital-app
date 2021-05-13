const sql = require("./db.js");

class Patient {

    static async create(patient) {
        if (!patient) throw "Patient is null";

        let rows = await sql.query("INSERT INTO patients SET ?", patient);
        return rows;
    }

    static async updatePatient(patient) {
        if (!patient) throw "Patient is null";

        let rows = await sql.query("UPDATE patients SET ? WHERE patientid = ?", [patient, patient.patientid]);
        return rows;
    }

    static async addTestResult(patientid, doctorid, testresult) {
        let test = { doctorid: doctorid, patientid: patientid, desk: testresult };
        let rows = await sql.query("INSERT INTO tests SET ?", test);
        
        return rows;
    }

    static async getByUserId(id) {
        if (!id) throw "Id not specified!";

        let rows = await sql.query("SELECT * FROM patients WHERE userid = ?", id);
        return rows[0];
    }

    static async getByPatientId(id) {
        if (!id) throw "Id not specified!";

        let rows = await sql.query("SELECT * FROM patients WHERE patientid = ?", id);
        return rows[0];
    }

    static async getAllPatients() {
        let rows = await sql.query("SELECT * FROM patients");
        
        return rows;
    }

    static async getAllPatiantsByDoctor(doctorid) {
        if (!doctorid) throw "Doctor ID not specified!";

        let rows = await sql.query("SELECT * FROM patients WHERE doctorid = ?", doctorid);
        return rows;
    }
}

module.exports = Patient;