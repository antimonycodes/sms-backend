import { rateLimit } from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 60000, //1mins
  limit: 60, // max 60 requests per windowMs per IP
  standardHeaders: 'draft-8', // return rate limit info in the 'RateLimit-*' headers
  legacyHeaders: false, // disable the 'X-RateLimit-*' headers
  message: {
    error: 'Too many requests, please try again',
  },
});

export default limiter;
