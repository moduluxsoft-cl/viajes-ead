import { encryptQRData } from './encryption';

describe('dummy with encryption', () => {
    it('should pass', () => {
        expect(encryptQRData).toBeDefined();
    });
});
