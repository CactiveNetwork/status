import pm2 from 'pm2';
import phin from 'phin';
import os from 'os';
import config from './config';

update_data();
setInterval(() => update_data, 10000);

async function update_data(): Promise<void> {
	pm2.list(async (error, processes) => {
		if (error) return;

		await phin({
			url: 'https://status.cactive.network/data',
			method: 'POST',
			data: {
				server: os.hostname(),
				processes: processes.map(process => ({
					name: process.name,
					active: process.pm2_env?.status === 'online',
					stats: {
						restarts: process.pm2_env?.restart_time ?? 0,
						uptime: process.pm2_env?.pm_uptime ?? 0,
						memory: process.monit?.memory ?? 0,
						cpu: process.monit?.cpu ?? 0,
					},
				})),
			},
			headers: {
				authorization: config.token,
				'content-type': 'application/json',
			},
		});
	});
}
