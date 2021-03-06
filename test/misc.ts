import 'mocha'
import * as assert from 'assert'
import * as https from 'https'

import {utils} from './../src/'
const {jsonRequest} = utils

const testCert = `
-----BEGIN CERTIFICATE-----
MIICATCCAWoCCQDXkjNZjrixdzANBgkqhkiG9w0BAQUFADBFMQswCQYDVQQGEwJB
VTETMBEGA1UECBMKU29tZS1TdGF0ZTEhMB8GA1UEChMYSW50ZXJuZXQgV2lkZ2l0
cyBQdHkgTHRkMB4XDTE3MDgzMDE1MzA1OFoXDTE4MDgzMDE1MzA1OFowRTELMAkG
A1UEBhMCQVUxEzARBgNVBAgTClNvbWUtU3RhdGUxITAfBgNVBAoTGEludGVybmV0
IFdpZGdpdHMgUHR5IEx0ZDCBnzANBgkqhkiG9w0BAQEFAAOBjQAwgYkCgYEAxcb0
4nPruXXjWUSafQR4896jwc4xJW9hz8j6o91OSZRHzH3A5rzpdgqcwq3E7K+lgnjD
NzrvwqgP0EU22fFhegz+CsMNOu4rxS1CIoPdkZgR5EFpEQL+b4VDZPqw4G4eonWe
FvivFvjufaEUe3KgwJICURXuw33HRu7THOD52T0CAwEAATANBgkqhkiG9w0BAQUF
AAOBgQBpR0TQ5I5YR3YcfZ3hjx8EwT6IxoNHKLzcV1bRSO3Rs3JkmMjMUsi4nIdu
AGkE6SbVKGm9Aq6ZDjuOZTIeOusU61egyBktW2RMEQ/pquocgEdwvlZU5Ay5UEoj
sdebuzKQ4XvbT3pdI5rUw/3Iyh93gwHtj5DC1QmeMiTO79Bkgg==
-----END CERTIFICATE-----
`

const testKey = `
-----BEGIN RSA PRIVATE KEY-----
MIICWwIBAAKBgQDFxvTic+u5deNZRJp9BHjz3qPBzjElb2HPyPqj3U5JlEfMfcDm
vOl2CpzCrcTsr6WCeMM3Ou/CqA/QRTbZ8WF6DP4Kww067ivFLUIig92RmBHkQWkR
Av5vhUNk+rDgbh6idZ4W+K8W+O59oRR7cqDAkgJRFe7DfcdG7tMc4PnZPQIDAQAB
AoGAaiLFFCmlXNe49BTu2xxlVGosczsWAMLvOLTgXMPM2YurpD/wH2NN3jz/tzHN
tj7kkUoBaUhFlq7eHaSnNPpmlklslpsCkQy/A/kfFZCx7CgndExCCIbB4Ek64Wyb
K2EOrzpcJAh7ipQDBC3KksJbjwTIyiz4LcaUm6b2K29gRHkCQQDpRQ01Xpj5959l
JUUd5PKSk3VQgIXUcDy8axaZrf3MA3ophyUlAE/RHys8uMCX4LZWBfSrTPBfpu59
At8RFz5fAkEA2QyJrQCMnfodXcKHPxr8cE7IPbaXBrUphIftbWVL6f4KI+oePQbJ
fO7AOaeWP877GzA1iMOqkYnNCqhhD1hV4wJAX3ZGxYSFDibsMDRkaKt9Kcb2x48R
NbMI6ALbKOEvcAIsSDpqVQ4fm/EpfJwPFRh9Bg9B5aiC5mImTzqRlyjv+QJAPhFE
yZEvpPliLm6zaEtaRu9weZ1eQM/LiJeqQK9H7yjzU2Pes8reEXjgxVv0LlkNG7BE
jtCNVUMXvGV8I/w5ywJAGBtLIEM/cWhs1WjhW0olsWnfLYtDvQLLQp78Yp+1zOld
ZGLKLPKH0YJMTQ3nr+hUlLxL7j9NmBwmf9H6oFXGKw==
-----END RSA PRIVATE KEY-----
`

describe('jsonRequest', function() {

    const port = process.env['TEST_HTTP_PORT'] ? parseInt(process.env['TEST_HTTP_PORT'] as string) : 63205
    let server = https.createServer({key: testKey, cert: testCert}, (request, response) => {
        if (request.url === '/ok') {
            response.end('{"foo": "bar"}')
        } else {
            response.writeHead(418)
            response.end('{"bfo:, "bar"\r\x21')
        }
    })

    before((done) => {
        server.listen(port, 'localhost', done)
    })

    after((done) => {
        server.close(done)
    })

    it('should make request', async function() {
        const rv = await jsonRequest({port, path: '/ok', rejectUnauthorized: false}, {foo: 'bar'})
        assert.deepEqual(rv, {foo: 'bar'})
    })

    it('should handle invalid json from server', async function() {
        try {
            await jsonRequest({port, path: '/fail', rejectUnauthorized: false}, {foo: 'bar'})
            assert(false, 'should not be reached')
        } catch (error) {
            assert.equal(error.toString(), 'ResponseError: Unable to read response data: Unexpected token b in JSON at position 9')
            assert.deepEqual(error.jse_info, {code: 418})
        }
    })

    it('should handle request errors', async function() {
        try {
            await jsonRequest({port, path: '/ok', rejectUnauthorized: true}, {foo: 'bar'})
            assert(false, 'should not be reached')
        } catch (error) {
            assert.equal(error.toString(), 'RequestError: Unable to send request: self signed certificate')
        }
    })

    it('should handle unserializable object', async function() {
        let tryThis = {what: null as any}
        tryThis.what = tryThis
        try {
            await jsonRequest({}, tryThis)
            assert(false, 'should not be reached')
        } catch (error) {
            assert.equal(error.toString(), 'RequestError: Unable to stringify request data: Converting circular structure to JSON')
        }
    })

})
