import dotenv from 'dotenv';
dotenv.config();

export default {
	token: process.env.TOKEN!, // environment variable for user API token
	send_delay: 3000, // in milliseconds,
	normal_logs: {
		limit_max_logs: true,
		max_lines: 1000,
	},
	error_logs: {
		limit_max_logs: true,
		max_lines: 1000,
	},
};
