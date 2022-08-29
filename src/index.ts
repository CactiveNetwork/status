import pm2 from 'pm2';
import phin from 'phin';
import os from 'os';
import config from './config';
import { createReadStream } from 'fs';
import readline from 'readline';

update_data();
setInterval(update_data, config.send_delay);

interface LogData {
	lines_count: null | number;
	lines_values: string[];
}

let normal_logs: Map<string, LogData> = new Map();
let error_logs: Map<string, LogData> = new Map();

async function retrieve_lines(
	retrieve_lines: boolean,
	output_location: string,
	error_location: string,
): Promise<[LogData, LogData]> {
	return new Promise(async resolve => {
		let normal_lines = 0,
			error_lines = 0;
		let normal_values: string[] = [],
			error_values: string[] = [];
		let completed_normal = false,
			completed_error = false;

		const check_completed = () => {
			if (completed_normal && completed_error)
				return resolve([
					{ lines_count: normal_lines, lines_values: normal_values },
					{ lines_count: error_lines, lines_values: error_values },
				]);
		};

		const normal_interface = readline.createInterface({
				input: createReadStream(output_location),
				output: process.stdout,
				terminal: false,
			}),
			error_interface = readline.createInterface({
				input: createReadStream(error_location),
				output: process.stdout,
				terminal: false,
			});

		normal_interface.on('line', line => {
			if (retrieve_lines) normal_values.push(line);
			normal_lines++;
		});
		error_interface.on('line', line => {
			if (retrieve_lines) normal_values.push(line);
			error_lines++;
		});

		normal_interface.on('close', () => {
			completed_normal = true;
			check_completed();
		});
		error_interface.on('close', () => {
			completed_error = true;
			check_completed();
		});
	});
}

async function listen(
	output_location: string,
	error_location: string,
): Promise<void> {
	const normal_reference = normal_logs.get(output_location),
		error_reference = error_logs.get(error_location);

	const old_normal_count = normal_reference?.lines_count ?? 0,
		old_error_count = error_reference?.lines_count ?? 0;

	const [new_normal, new_error] = await retrieve_lines(
		true,
		output_location,
		error_location,
	);

	let new_normal_lines: string[] = [],
		new_error_lines: string[] = [];

	for (let i = old_normal_count; i < new_normal.lines_count!; i++) {
		new_normal_lines.push(new_normal.lines_values![i]);
	}

	for (let i = old_error_count; i < new_error.lines_count!; i++) {
		new_error_lines.push(new_normal.lines_values![i]);
	}

	normal_logs.set(output_location, {
		lines_count: new_normal.lines_count,
		lines_values: new_normal_lines,
	});
	error_logs.set(error_location, {
		lines_count: new_error.lines_count,
		lines_values: new_error_lines,
	});
}

async function retrieve_logs(
	output_location: string = '',
	error_location: string = '',
): Promise<[string[], string[], boolean]> {
	let initial = false;
	if (!output_location || !error_location) return [[], [], initial];

	if (!normal_logs.has(output_location) || !error_logs.has(error_location)) {
		initial = true;
		normal_logs.set(output_location, { lines_count: null, lines_values: [] });
		error_logs.set(error_location, { lines_count: null, lines_values: [] });
	}

	await listen(output_location, error_location);

	const normal_data = normal_logs.get(output_location),
		error_data = error_logs.get(error_location);

	const normal_values = normal_data?.lines_values ?? [],
		error_values = error_data?.lines_values ?? [];

	normal_logs.set(output_location, {
		lines_count: normal_data?.lines_count ?? 0,
		lines_values: [],
	});
	error_logs.set(output_location, {
		lines_count: error_data?.lines_count ?? 0,
		lines_values: [],
	});

	return [normal_values, error_values, initial];
}

async function update_data(): Promise<void> {
	pm2.list(async (error, processes) => {
		if (error) return;

		let processes_data = [];

		for (let i = 0; i < processes.length; i++) {
			const process = processes[i];

			const [normal_logs, error_logs, initial] = await retrieve_logs(
				process.pm2_env?.pm_out_log_path,
				process.pm2_env?.pm_err_log_path,
			);

			processes_data.push({
				name: process.name,
				active: process.pm2_env?.status === 'online',
				stats: {
					restarts: process.pm2_env?.restart_time ?? 0,
					uptime: process.pm2_env?.pm_uptime ?? 0,
					memory: process.monit?.memory ?? 0,
					cpu: process.monit?.cpu ?? 0,
				},
				initial,
				normal_logs,
				error_logs,
			});
		}

		await phin({
			url: 'https://status.cactive.network/data',
			method: 'POST',
			data: JSON.stringify({
				server: os.hostname(),
				processes: processes_data,
			}),
			headers: {
				Authorization: config.token,
				'Content-Type': 'application/json',
			},
		});
	});
}
