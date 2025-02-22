import React, { Component } from 'react';
import { PreviewWrapper, Spinner, Wrapper } from './styledComponents/index';
import { Footer, Header, PreResize, Preview } from './components/index';
import imageType from 'image-type';
import './lib/caman';
import { getCanvasNode } from './utils/global.utils';


const INITIAL_PARAMS = {
  effect: null,
  filter: null,
  crop: null,
  resize: null,
  rotate: null,
  correctionDegree: 0,
  flipX: false,
  flipY: false,
  adjust: {
    brightness: 0,
    contrast: 0,
    saturation: 0,
    exposure: 0
  },
  canvasDimensions: { width: 300, height: 200, ratio: 1.5 }
};

export default class extends Component {
  constructor(props) {
    super();

    const {
      processWithCloudimage, processWithFilerobot, uploadWithCloudimageLink, reduceBeforeEdit, cropBeforeEdit,
      watermark
    } = props.config;

    this.state = {
      isShowSpinner: true,
      isHideCanvas: false,
      activeTab: null,
      activeBody: null,
      currentOperation: null,
      original: { width: 300, height: 200 },
      cropDetails: { width: 300, height: 200 },
      canvasDimensions: { width: 300, height: 200, ratio: 1.5 },
      processWithFilerobot: processWithFilerobot,
      processWithCloudimage: processWithCloudimage,
      uploadCloudimageImage: uploadWithCloudimageLink,
      reduceBeforeEdit,
      cropBeforeEdit,

      operationsOriginal: [],
      operationsZoomed: [],
      operations: [],

      canvasZoomed: null,
      canvasOriginal: null,
      isPreResize: false,

      initialZoom: 1,

      ...INITIAL_PARAMS,
      watermark: watermark || {
        opacity: 0.7,
        position: 'center',
        url: '',
        applyByDefault: false
      }
    }
  }

  componentDidMount() {
    this.loadImage();
    this.determineImageType();
  }

  loadImage = () => {
    const { src } = this.props;
    const { reduceBeforeEdit: { mode, widthLimit, heightLimit } = {}, watermark } = this.state;
    const splittedSrc = src.split('/');
    const imageName = splittedSrc[splittedSrc.length - 1];
    const img = new Image();
    let logoImage = null;

    if (watermark && watermark.url) {
      logoImage = new Image();
      logoImage.setAttribute('crossOrigin', 'Anonymous');
      logoImage.src = watermark.url + '?' + new Date().getTime();
    }

    img.src = src + '?' + new Date().getTime();
    img.setAttribute('crossOrigin', 'Anonymous');

    img.onload = () => {
      const canvasDimensions = { width: img.width, height: img.height, ratio: img.width / img.height };
      const propsOnApply = {
        activeBody: 'preResize',
        isShowSpinner: false,
        img,
        logoImage,
        imageName: imageName.indexOf('?') > -1 ? imageName.slice(0, imageName.indexOf('?')) : imageName,
      };

      if (mode === 'manual' && (widthLimit < img.width || heightLimit < img.height)) {
        this.setState({
          canvasDimensions,
          ...propsOnApply
        });
      } else if (mode === 'auto' && (widthLimit < img.width || heightLimit < img.height)) {
        if (img.width >= img.height) {
          const ratio = img.width / img.height;
          const dimensions = { ratio, width: widthLimit, height: widthLimit / ratio };

          this.setState({
            preCanvasDimensions: { ...dimensions },
            canvasDimensions: { ...dimensions },
            ...propsOnApply,
            activeBody: 'preview',
            isPreResize: true
          });
        } else {
          const ratio = img.height / img.width;
          const dimensions = { ratio, width: heightLimit / ratio, height: heightLimit };

          this.setState({
            preCanvasDimensions: { ...dimensions },
            canvasDimensions: { ...dimensions },
            ...propsOnApply,
            activeBody: 'preview',
            isPreResize: true
          });
        }
      } else {
        this.setState({ ...propsOnApply, activeBody: 'preview', isPreResize: false });
      }
    }
  }

  determineImageType = () => {
    const xhr = new XMLHttpRequest();

    xhr.open('GET', this.props.src);
    xhr.responseType = 'arraybuffer';

    xhr.onload = ({ target }) => {
      this.setState({ imageMime: imageType(new Uint8Array(target.response)).mime });
    };

    xhr.send();
  }

  updateState = (props, callback = () => {}) => {
    this.setState(props, callback);
  }

  onRevert = () => {
    const { cancelLastOperation, activeTab } = this.state;

    this.setState({ activeTab: null, isHideCanvas: true, isShowSpinner: true });

    cancelLastOperation(activeTab, () => {
      this.setState({ isHideCanvas: false, isShowSpinner: false, ...INITIAL_PARAMS });
    });
  }

  onAdjust = (handler, value) => {
    const { onAdjust } = this.state;

    onAdjust(handler, value);
  }

  onRotate = (value, correctionDegree, flipX, flipY) => {
    const { onRotate } = this.state;

    onRotate(value, correctionDegree, flipX, flipY);
  }

  onFlip = (axis) => {
    const { flip } = this.state;

    flip(axis);
  }

  onSave = () => {
    const { saveImage } = this.state;

    this.setState({ isShowSpinner: true });
    saveImage();
  }

  onDownloadImage = () => {
    const { onBeforeComplete } = this.props;
    const { downloadImage, initialZoom } = this.state;
    const canvasID = initialZoom !== 1 ? 'scaleflex-image-edit-box-original' : 'scaleflex-image-edit-box';
    const canvas = getCanvasNode(canvasID);
    const isDownload = onBeforeComplete ? onBeforeComplete({ status: 'before-complete', canvas }) : true;

    if (isDownload) {
      downloadImage(() => {
        this.props.onComplete({ status: 'success', canvas });
        this.props.onClose();
      });
    } else {
      this.props.onComplete({ status: 'success', canvas });
      this.props.onClose();
    }
  }

  onApplyEffects = name => {
    const { applyCorrections, effect } = this.state;
    const nextEffect = effect === name ? null : name;

    this.setState(
      { isShowSpinner: true, effect: nextEffect },
      () => {
        applyCorrections(
          () => {
            this.setState({ isShowSpinner: false })
          }
        );
      }
    );
  }

  onApplyFilters = name => {
    const { applyCorrections, filter } = this.state;
    const nextFilter = filter === name ? null : name;

    this.setState(
      { isShowSpinner: true, filter: nextFilter },
      () => {
        applyCorrections(
          () => {
            this.setState({ isShowSpinner: false })
          }
        );
      }
    );
  }

  handleSave = () => {
    const { processWithFilerobot, processWithCloudimage } = this.state;

    if (!processWithFilerobot && !processWithCloudimage) {
      this.onDownloadImage();
    } else {
      this.onSave();
    }
  }

  apply = () => {
    const { activeTab, applyChanges } = this.state;

    applyChanges(activeTab);
    this.setState({ activeTab: null });
  }

  redoOperation = (operationIndex, callback = () => {}, resetActiveTab = true) => {
    const { applyOperations } = this.state;

    if (resetActiveTab) {
      this.setState({ activeTab: null, isHideCanvas: true, isShowSpinner: true });
    } else {
      this.setState({ isHideCanvas: true, isShowSpinner: true });
    }

    applyOperations(
      operationIndex,
      () => {
        this.setState({ isHideCanvas: false, isShowSpinner: false }, callback);
      },
    );
  }

  resetOperations = () => {
    const { resetAll } = this.state;

    this.setState({ activeTab: null, isHideCanvas: true, isShowSpinner: true });

    resetAll(() => {
      this.setState({
        isHideCanvas: false,
        isShowSpinner: false,
        ...INITIAL_PARAMS
      });
    });
  }

  onPreResize = (value) => {
    switch (value) {
      case 'keep':
        this.setState({ canvasDimensions: {}, isPreResize: false, activeBody: 'preview' });
        break;
      case 'resize':
        const { canvasDimensions } = this.state;
        this.setState({ preCanvasDimensions: canvasDimensions, isPreResize: true, activeBody: 'preview' });
        break;
    }
  }

  render() {
    const {
      isShowSpinner, activeTab, operations, operationsOriginal, operationsZoomed, currentOperation, isHideCanvas,
      cropDetails, original, canvasDimensions, processWithCloudimage, processWithFilerobot, uploadCloudimageImage,
      imageMime, lastOperation, operationList, initialZoom, canvasZoomed, canvasOriginal, reduceBeforeEdit,
      cropBeforeEdit, img, imageName, activeBody, isPreResize, preCanvasDimensions, logoImage,

      effect,
      filter,
      crop,
      resize,
      rotate,
      correctionDegree,
      flipX,
      flipY,
      adjust,
      watermark
    } = this.state;
    const { src, config, onClose, onComplete, closeOnLoad = true, showGoBackBtn = false, t = {}, theme } = this.props;
    const imageParams = { effect, filter, crop, resize, rotate, flipX, flipY, adjust, correctionDegree };
    const headerProps = {
      t,
      theme,
      cropDetails,
      original,
      activeTab,
      src,
      onClose,
      config,
      canvasDimensions,
      processWithCloudimage,
      processWithFilerobot,
      operations,
      operationsOriginal,
      operationsZoomed,
      initialZoom,
      isShowSpinner,
      showGoBackBtn,
      img,
      logoImage,
      imageName,
      activeBody,
      preCanvasDimensions,
      tools: config.tools,
      updateState: this.updateState,
      onRevert: this.onRevert,
      apply: this.apply,
      onSave: this.onSave,
      onFlip: this.onFlip,
      onApplyEffects: this.onApplyEffects,
      onApplyFilters: this.onApplyFilters,
      onRotate: this.onRotate,
      onAdjust: this.onAdjust,
      onDownloadImage: this.onDownloadImage,
      handleSave: this.handleSave,

      ...imageParams,
      watermark
    };
    const previewProps = {
      t,
      theme,
      cropDetails,
      original,
      activeTab,
      isShowSpinner,
      operations,
      operationsOriginal,
      operationsZoomed,
      initialZoom,
      currentOperation,
      isHideCanvas,
      src,
      imageMime,
      onClose,
      onComplete,
      canvasDimensions,
      closeOnLoad,
      config,
      processWithCloudimage,
      uploadCloudimageImage,
      lastOperation,
      operationList,
      canvasZoomed,
      canvasOriginal,
      reduceBeforeEdit,
      cropBeforeEdit,
      img,
      logoImage,
      imageName,
      isPreResize,
      preCanvasDimensions,
      updateState: this.updateState,
      handleSave: this.handleSave,
      onPreResize: this.onPreResize,
      redoOperation: this.redoOperation,

      ...imageParams,
      watermark
    };
    const footerProps = {
      logoImage,
      t,
      theme,
      activeBody,
      operations,
      operationsOriginal,
      operationsZoomed,
      initialZoom,
      currentOperation,
      processWithCloudimage,
      updateState: this.updateState,
      redoOperation: this.redoOperation,
      resetOperations: this.resetOperations,
      config,
      watermark
    };

    return (
      <Wrapper>

        <Header {...headerProps}/>

        <PreviewWrapper>
          {activeBody === 'preview' && <Preview {...previewProps}/>}
          {activeBody === 'preResize' && <PreResize {...previewProps}/>}

          <Spinner overlay show={isShowSpinner} label={t['spinner.label']}/>
        </PreviewWrapper>
        <Footer {...footerProps}/>

      </Wrapper>
    )
  }
}