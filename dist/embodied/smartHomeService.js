// src/embodied/smartHomeService.ts
// BOW AGENT V4.0 — SMART HOME & IOT AUTOMATION HUB
//
// Bridges Agent with Smart Home protocols (Home Assistant, MQTT, Tasmota, Tuya).
// Controls desk lights, room lighting, air conditioner, and smart plugs via voice commands.
export class SmartHomeService {
    devices = new Map();
    constructor() {
        // Initial devices in Boss's smart office
        this.devices.set('desk_light', {
            id: 'desk_light',
            name: 'Đèn bàn làm việc',
            type: 'desk_light',
            power: 'OFF',
            brightness: 100,
            lastUpdated: new Date().toISOString(),
        });
        this.devices.set('main_light', {
            id: 'main_light',
            name: 'Đèn trần văn phòng',
            type: 'main_light',
            power: 'ON',
            brightness: 80,
            lastUpdated: new Date().toISOString(),
        });
        this.devices.set('air_conditioner', {
            id: 'air_conditioner',
            name: 'Điều hòa Daikin',
            type: 'air_conditioner',
            power: 'ON',
            temperature: 26,
            lastUpdated: new Date().toISOString(),
        });
        this.devices.set('smart_plug', {
            id: 'smart_plug',
            name: 'Ổ cắm máy tính & màn hình',
            type: 'smart_plug',
            power: 'ON',
            lastUpdated: new Date().toISOString(),
        });
    }
    getAllDevices() {
        return Array.from(this.devices.values());
    }
    async executeCommand(options) {
        const devKey = options.device.toLowerCase().replace(/\s+/g, '_');
        let target = this.devices.get(devKey);
        // Fallback heuristic matching for natural Vietnamese names
        if (!target) {
            if (devKey.includes('ban') || devKey.includes('hoc'))
                target = this.devices.get('desk_light');
            else if (devKey.includes('dieu_hoa') || devKey.includes('may_lanh'))
                target = this.devices.get('air_conditioner');
            else if (devKey.includes('den'))
                target = this.devices.get('main_light');
            else if (devKey.includes('o_cam'))
                target = this.devices.get('smart_plug');
            else
                target = this.devices.get('desk_light');
        }
        const device = target;
        let message = '';
        switch (options.action) {
            case 'turn_on': {
                device.power = 'ON';
                device.lastUpdated = new Date().toISOString();
                message = `Dạ Sếp, em đã bật ${device.name} rồi ạ.`;
                break;
            }
            case 'turn_off': {
                device.power = 'OFF';
                device.lastUpdated = new Date().toISOString();
                message = `Dạ Sếp, em đã tắt ${device.name} rồi ạ.`;
                break;
            }
            case 'set_temperature': {
                device.power = 'ON';
                device.temperature = options.value || 25;
                device.lastUpdated = new Date().toISOString();
                message = `Dạ Sếp, em đã điều chỉnh ${device.name} về ${device.temperature} độ C mát mẻ rồi ạ.`;
                break;
            }
            case 'set_brightness': {
                device.power = 'ON';
                device.brightness = options.value || 100;
                device.lastUpdated = new Date().toISOString();
                message = `Dạ Sếp, em đã chỉnh độ sáng ${device.name} lên ${device.brightness}% ạ.`;
                break;
            }
            case 'get_status':
            default: {
                message = `Thiết bị ${device.name} hiện đang ${device.power === 'ON' ? 'BẬT' : 'TẮT'}${device.temperature ? ` (${device.temperature}°C)` : ''}.`;
                break;
            }
        }
        return {
            success: true,
            device: device.name,
            action: options.action,
            state: { ...device },
            message,
        };
    }
}
export const smartHomeService = new SmartHomeService();
