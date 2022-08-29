import dotenv from 'dotenv';
dotenv.config();

export default {
	token: process.env.TOKEN!, // environment variable for user API token
	send_delay: 3000, // in milliseconds
};
