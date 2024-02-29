//server
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
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

// Tasks

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
});

//Tokens
const generateToken = (payload) => {
  const token = jwt.sign(payload, 'secret_key');
  return token;
};
const verifyToken = (token) => {
  try {
    const decoded = jwt.verify(token, 'secret_key');
    return decoded;
  } catch (err) {
    return null;
  }
};

//Middelware de autenticación
const authenticateToken = (req, res, next) => {
  const token = req.headers['authorization'];
  console.log(token);

  if (!token) {
    return res.status(401).json({ error: 'Token no proporcionado' });
  }

  const decoded = verifyToken(token);

  if (!decoded) {
    return res.status(401).json({ error: 'Token inválido' });
  }

  req.user = decoded;
  next();
};

// Ruta protegida
api.get('/protected-path', authenticateToken, (req, res) => {
  // Acceso autorizado, se puede acceder al objeto `req.user` que contiene los datos decodificados del token
  res.json({ message: 'Authorized access', user: req.user });
});

// Register
api.post('/register', async (req, res) => {
    console.log(req.body);

    const password = req.body.userpassword;
    console.log(password);
    
    const passwordHash = await bcrypt.hash(password, 10);
    console.log(passwordHash);
    let resultUser = {
      username: req.body.username,
      nickname: req.body.nickname,
      birthday: req.body.birthday,
      email: req.body.email,
      image: req.body.image,
      userpassword: passwordHash,
    };
  
    console.log(req.body);
  
    const sql =
      'INSERT INTO users (username, nickname, birthday, email, image, userpassword) values (?, ?, ?, ?, ?, ?)';
  
    jwt.sign(resultUser, 'secret_key', async (err, token) => {
      if (err) {
        res.status(400).send({ msg: 'Error' });
      } else {
        const conex = await connect_db();
        const [results] = await conex.query(sql, [
          resultUser.username,
          resultUser.nickname,
          resultUser.birthday,
          resultUser.email,
          resultUser.image,
          resultUser.userpassword,
        ]);
        conex.end();
        //Si todo sale bien, se envía una respuesta JSON con un mensaje de éxito, el token JWT y el insertId,
        //que es el ID del usuario recién insertado en la base de datos.
        res.json({ msg: 'success', token: token, id: results.insertId });
      }
    });
  });

//Login
api.post('/login', async (request, response) => {
    //recibe el cuerpo de la solicitud, que debería contener el nombre de usuario y la contraseña.
    const body = request.body;
    //Buscar si el usuario existe en la bases de datos
    const sql = `SELECT * FROM users WHERE email= ?`;
    const connection = await connect_db();
    const [users, fields] = await connection.query(sql, [body.email]);
    connection.end();
    const user = users[0];
    console.log(user);
    console.log(body.userpassword);
    console.log(user.userpassword);
    //Comprueba si el usuario existe y si la contraseña proporcionada es correcta utilizando bcrypt.compare.
    const passwordCorrect =
      user === null
        ? false
        : await bcrypt.compare(body.userpassword, user.userpassword);
  
    //Si el usuario no existe o la contraseña es incorrecta, responde con un estado 401 y un mensaje de error.
    if (!(user && passwordCorrect)) {
      return response.status(401).json({
        error: 'Credenciales inválidas',
      });
    }
  
    //Si las credenciales son correctas, se prepara un objeto userForToken que incluye el username y el id del usuario.
    const userForToken = {
      email: user.email,
      id: user.id,
    };
  
    //Crear el token para enviar al front
    const token = generateToken(userForToken);
   console.log(token);
    //Finalmente, si todo es correcto, la función responde con un estado 200 y envía un objeto JSON con el token, el nombre de usuario y el nombre real del usuario.
    response.status(200).json({ token, email: user.email });
  });

//Get info PROFILE
api.get("/profile", authenticateToken, async (req, res) => {
    let sql = `SELECT * FROM users WHERE email= ?`;
    const connect = await connect_db();
    const [profile] = await connect.query(sql, [req.user.email]);
    connect.end();
    const response = {
      profile: profile,
    };
    res.json({ message: 'Authorized access', user: req.user });
  });