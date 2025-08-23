const errorHandling = (err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    statusCode: 500,
    status: "error",
    message: err.message,
  });
};

export default errorHandling;
