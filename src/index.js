//server
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
require('dotenv').config();

//crear el servidor
const api = express();
api.use(cors());
api.use(express.json());

const port = process.env.PORT || 4500;

async function connect_db() {
  const conex = await mysql.createConnection({
    host: process.env.HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || 'Localhost',
    database: 'journal',
  });
  conex.connect();
  return conex;
}

connect_db();

api.listen(port, () => {
  console.log(`servidor escuchado por http://localhost:${port}`);
});

api.post('/tasks', async (req, res) => {
  const data = req.body;
  const { task_name, created_at, due_date, completed, completed_at } = data;
  const conex = await connect_db();
  const sql =
    'INSERT into tasks (task_name, created_at, due_date, completed, completed_at) values (?, ?, ?, ?, ?)';
  const [result] = await conex.query(sql, [
    task_name,
    created_at,
    due_date,
    completed,
    completed_at,
  ]);
  console.log(result);

  res.json({
    success: true,
    id: result.insertId,
  });
});

api.get('/tasks', async (req, res) => {
  const conex = await connect_db();
  const tasksSQL = 'SELECT * FROM tasks';
  const [result] = await conex.query(tasksSQL);
  //   const numOfElements = result.length;

  res.json({
    info: { count: result.length },
    results: result,
  });
});

api.get('/tasks/:completed', async (req, res) => {
  const completed = req.params.completed;
  const conex = await connect_db();

  if (isNaN(parseInt(completed))) {
    return res.json({
      success: false,
      error: 'el completed debe ser un número',
    });
  }
  const query = 'SELECT * FROM tasks WHERE completed = ?';
  const [result] = await conex.query(query, [completed]);

  conex.end();

  if (result.length === 0) {
    return res.json({ success: true, message: 'El task no existe' });
  }
  res.json({ success: true, completed: result });
});

api.put('/tasks/:id', async (req, res) => {
  try {
    const conex = await connect_db();
    const id = req.params.id;
    const data = req.body;
    const { task_name, created_at, due_date, completed, completed_at } = data;

    const sql =
      'UPDATE tasks set task_name= ?, created_at= ?, due_date= ?, completed= ?, completed_at= ? WHERE id= ?';
    const [result] = await conex.query(sql, [
      task_name,
      created_at,
      due_date,
      completed,
      completed_at,
      id,
    ]);
    res.json({
      success: true,
      message: 'actualizado correctamente',
    });
  } catch (error) {
    console.log(error);
  }
});

api.delete('/tasks', async (req, res) => {
    const conex = await connect_db();
    const idTasks = req.query.id;
  
    const sql = 'DELETE from tasks WHERE id= ?';
    const [result] = await conex.query(sql, [idTasks]);
    console.log(result);
     if (result.affectedRows > 0) {
      res.json({
        success: true,
        message: 'eliminado correctamente',
      });
     } else {
      res.json({
        success: false,
        message: 'No se ha eliminado nada',
      });
     }
  })
