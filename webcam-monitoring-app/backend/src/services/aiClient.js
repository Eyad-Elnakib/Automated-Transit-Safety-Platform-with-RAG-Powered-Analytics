const axios = require('axios');

class AiClient {
  constructor({ aiServiceUrl, healthPath, predictPath }) {
    this.aiServiceUrl = aiServiceUrl;
    this.healthPath = healthPath;
    this.predictPath = predictPath;
    this.http = axios.create({
      timeout: 20000,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  async checkHealth() {
    const url = `${this.aiServiceUrl}${this.healthPath}`;
    const res = await this.http.get(url);
    return res.data;
  }

  async predict({ imageBase64, imageMime, width, height }) {
    const url = `${this.aiServiceUrl}${this.predictPath}`;
    const res = await this.http.post(url, { imageBase64, imageMime, width, height });
    return res.data;
  }
}

module.exports = AiClient;

